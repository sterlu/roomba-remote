#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

const char* ssid = "TODO";
const char* password = "TODO";

unsigned int localPort = 2390; // port to listen on

#define LED_ON 0
#define LED_OFF 1

WiFiUDP Udp;
char packetBuffer[255]; //buffer to hold incoming packet
char replyBuffer[] = "ack0";
char noReplyBuffer[] = "No reply from roomba";
char readBuffer[255]; //buffer to hold read sensor data

void setup() {
  Serial.begin(115200);
  delay(10);

  // Connect to WiFi network
  // Serial.print("Connecting to ");
  // Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    // Serial.print(".");
  }
  // Serial.println("WiFi connected");

  // Print the IP address
  // Serial.println(WiFi.localIP());

  while ( Serial.available() > 0 ) {
    // Clear read buffer
    Serial.read();
  }

  Udp.begin(localPort);

  pinMode(LED_BUILTIN, OUTPUT);
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
      replyBuffer[3] = len;
      Udp.write(replyBuffer);
      Udp.endPacket();

      for (int i = 0; i < len; i++) {
        Serial.write((char)packetBuffer[i]);
      }

      if (packetBuffer[0] == 142 || packetBuffer[0] == 149) {
        // if sensor request, read data
        delay(25);

        int i = 0;
        while ( Serial.available() > 0) {
          readBuffer[i] = Serial.read();
          i++;
        }

        if (i == 0) {
          Udp.beginPacket(Udp.remoteIP(), Udp.remotePort());
          Udp.write(noReplyBuffer);
          Udp.endPacket();
        } else {
          Udp.beginPacket(Udp.remoteIP(), Udp.remotePort());
          Udp.write(readBuffer, i);
          Udp.endPacket();
        }
      }
    }
    digitalWrite(LED_BUILTIN, LED_OFF);
  }
}
