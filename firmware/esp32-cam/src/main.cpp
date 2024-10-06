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

char packetBuffer[255]; // Buffer to hold incoming packet
char ack[] = "ack0";
char noResponse[] = "No reply from roomba";
char readBuffer[255]; // Buffer to hold read sensor data
char replyBuffer[255];

WiFiUDP Udp;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

void clearReadBuffer() {
  while (Serial.available() > 0) Serial.read();
}

void writeToRoomba(char *buffer, int len) {
      for (int i = 0; i < len; i++) {
        Serial.write((char)buffer[i]);
      }
}

int onMessageReceived(char *messageBuffer, int len) {
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

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
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
  // Serial.println(WiFi.localIP());

  clearReadBuffer();

  Udp.begin(localPort);

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();

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
