#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include "wifi-credentials.h"

unsigned int localPort = 2390; // port to listen on

#define LED_ON 0
#define LED_OFF 1

WiFiUDP Udp;
char packetBuffer[255]; // Buffer to hold incoming packet
char replyBuffer[] = "ack0";
char noReplyBuffer[] = "No reply from roomba";
char readBuffer[255]; // Buffer to hold read sensor data

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

  digitalWrite(LED_BUILTIN, LED_ON);
  // LED on until first message received
}

void clearReadBuffer() {
  while (Serial.available() > 0) Serial.read();
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

      if (packetBuffer[0] == 128) {
        // Roomba prints out firmware version when booting up
        // RX buffer should be cleared to prevent interference when reading sensor data
        clearReadBuffer();
      }

      if (packetBuffer[0] == 142) {
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
          Udp.write(packetBuffer[1]); // set sensor group ID as first byte of reply
          Udp.write(readBuffer, i);
          Udp.endPacket();
        }
      }
    }
    digitalWrite(LED_BUILTIN, LED_OFF);
  }
}
