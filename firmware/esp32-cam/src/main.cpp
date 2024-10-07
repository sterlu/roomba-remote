#include <Arduino.h>
#include <esp_camera.h>
#include <WiFiUdp.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

#include "wifi-credentials.h"
#include "pins.h"

unsigned int localPort = 2390; // port to listen on

#define LED_ON 0
#define LED_OFF 1

bool serialDebug = false;

char packetBuffer[255]; // Buffer to hold incoming packet
char ack[] = "ack0";
char noResponse[] = "No reply from roomba";
char frameBufferError[] = "Error getting frame buffer";
char readBuffer[255]; // Buffer to hold read sensor data
char replyBuffer[255];

WiFiUDP Udp;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

camera_config_t cameraConfig = {
  .pin_pwdn = PWDN_GPIO_NUM,
  .pin_reset = RESET_GPIO_NUM,
  .pin_xclk = XCLK_GPIO_NUM,
  .pin_sccb_sda = SIOD_GPIO_NUM,
  .pin_sccb_scl = SIOC_GPIO_NUM,
  .pin_d7 = Y9_GPIO_NUM,
  .pin_d6 = Y8_GPIO_NUM,
  .pin_d5 = Y7_GPIO_NUM,
  .pin_d4 = Y6_GPIO_NUM,
  .pin_d3 = Y5_GPIO_NUM,
  .pin_d2 = Y4_GPIO_NUM,
  .pin_d1 = Y3_GPIO_NUM,
  .pin_d0 = Y2_GPIO_NUM,
  .pin_vsync = VSYNC_GPIO_NUM,
  .pin_href = HREF_GPIO_NUM,
  .pin_pclk = PCLK_GPIO_NUM,

  .xclk_freq_hz = 20000000,
  .ledc_timer = LEDC_TIMER_0,
  .ledc_channel = LEDC_CHANNEL_0,
  .pixel_format = PIXFORMAT_JPEG,
  .frame_size = FRAMESIZE_VGA,
  .jpeg_quality = 12, // 0-63, for OV series camera sensors, lower number means higher quality
  .fb_count = 2,
  .fb_location = CAMERA_FB_IN_PSRAM,
  .grab_mode = CAMERA_GRAB_WHEN_EMPTY, // CAMERA_GRAB_WHEN_EMPTY or CAMERA_GRAB_LATEST
};

void clearReadBuffer() {
  if (serialDebug) return;
  while (Serial.available() > 0) Serial.read();
}

void writeToRoomba(char *buffer, int len) {
      for (int i = 0; i < len; i++) {
        Serial.write((char)buffer[i]);
      }
}

bool setupCamera() {
  if (!psramFound()) {
    if (serialDebug) Serial.println("Warning: No PSRam found so defaulting to image size 'CIF'");
    cameraConfig.frame_size = FRAMESIZE_CIF;
  }

  // //power up the camera if PWDN pin is defined
  // if(CAM_PIN_PWDN != -1){
  //     pinMode(CAM_PIN_PWDN, OUTPUT);
  //     digitalWrite(CAM_PIN_PWDN, LOW);
  // }

  //initialize the camera
  esp_err_t err = esp_camera_init(&cameraConfig);
  if (err != ESP_OK) {
      if (serialDebug) Serial.println("Camera Init Failed");
      return err;
  }

  return ESP_OK;
}

bool captureAndSendToWs() {
    if (serialDebug) Serial.println("Starting capture");

    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      ws.binaryAll(frameBufferError, strlen(frameBufferError));
      return false;
    }
    if (serialDebug) Serial.println("Got pointer");

    ws.binaryAll(fb->buf, fb->len);

    if (serialDebug) Serial.println("Sent");
    // process_image(fb->width, fb->height, fb->format, fb->buf, fb->len);

    esp_camera_fb_return(fb);
    return true;
}

bool processCustomCommand(char *messageBuffer, int len) {
  if (messageBuffer[0] == 200) {
    captureAndSendToWs();
    return true;
  }
  if (messageBuffer[0] == 201) {
    int quality = messageBuffer[1];
    if (quality <= 63) {
      cameraConfig.jpeg_quality = messageBuffer[1];
      setupCamera();
    }
    return true;
  }
  if (messageBuffer[0] == 202) {
    int frameSize = messageBuffer[1];
    if (frameSize <= 13) {
      cameraConfig.frame_size = (framesize_t)frameSize;
      setupCamera();
    }
    return true;
  }
  if (messageBuffer[0] == 203) {
    int power = messageBuffer[1];
    analogWrite(LED_FLASH, power);
    return true;
  }
  return false;
}

int onMessageReceived(char *messageBuffer, int len) {
  bool customCommand = processCustomCommand(messageBuffer, len);
  if (customCommand) return 0;

  writeToRoomba(messageBuffer, len);

  if (messageBuffer[0] == 128) {
    // Roomba prints out firmware version when booting up
    // RX buffer should be cleared to prevent interference when reading sensor data
    clearReadBuffer();
  }

  if (messageBuffer[0] == 142) {
    // if sensor request, read data
    delay(25);

    replyBuffer[0] = messageBuffer[1]; // set sensor group ID as first byte of reply
    int bytesRead = 0;
    while ( Serial.available() > 0) {
      replyBuffer[1 + bytesRead] = Serial.read();
      bytesRead++;
    }

    if (bytesRead == 0) {
      strcpy(replyBuffer, noResponse);
      return strlen(noResponse);
    }
    return 1 + bytesRead;
  }
  return 0;
}

void wsOnEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      // Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      // Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA: {
        AwsFrameInfo *info = (AwsFrameInfo*)arg;
        if (info->final && info->index == 0 && info->len == len && (info->opcode == WS_TEXT || info->opcode == WS_BINARY)) {
          int replySize = onMessageReceived((char*)data, len);
          if (replySize > 0) ws.binaryAll(replyBuffer, replySize);
        }
      break;
    }
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_BUILTIN, OUTPUT);

  // Connect to WiFi network
  WiFi.begin(WIFI_SSID, WIFI_PWD);
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_BUILTIN, LED_ON);
    delay(250);
    digitalWrite(LED_BUILTIN, LED_OFF);
    delay(250);
  }
  // WiFi connected

  // Print the IP address
  if (serialDebug) Serial.println(WiFi.localIP());

  clearReadBuffer();

  Udp.begin(localPort);

  ws.onEvent(wsOnEvent);
  server.addHandler(&ws);
  server.begin();

  setupCamera();

  // pinMode(LED_FLASH, OUTPUT);

  digitalWrite(LED_BUILTIN, LED_ON);
  // LED on until first message received
}

void loop() {
  int packetSize = Udp.parsePacket();
  if (packetSize) {
    digitalWrite(LED_BUILTIN, LED_ON);
    int len = Udp.read(packetBuffer, 255);
    if (len > 0) {
      // Acknowledge received packet
      Udp.beginPacket(Udp.remoteIP(), Udp.remotePort());
      ack[3] = len;
      Udp.write((uint8_t*)ack, 4);
      Udp.endPacket();

      int replySize = onMessageReceived(packetBuffer, len);
      if (replySize > 0) {
        Udp.beginPacket(Udp.remoteIP(), Udp.remotePort());
        Udp.write((uint8_t*)replyBuffer, replySize);
        Udp.endPacket();
      }
    }
    digitalWrite(LED_BUILTIN, LED_OFF);
  }
}
