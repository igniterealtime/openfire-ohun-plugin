# Ohùn Plugin for openfire

Ohun is the Yoruba word for voice and is a simple audio conferencing solution for Openfire using the Kraken WebRTC [server](https://github.com/MixinNetwork/kraken) and [client](https://github.com/MixinNetwork/kraken.fm). 
It is for remote teams who will use it everyday to communicate and collaborate all day long without the need to show their faces or any other video. With the absence of video, it ensures high quality audio for the conversation at most times, even with more than 10 participants.

<img width="25%" src="https://github.com/igniterealtime/openfire-ohun-plugin/raw/master/ohun.png" />

## Installation

- Copy the ohun.jar file to the OPENFIRE_HOME/plugins directory.
- Configure the admin properties page.

## Configuration

Under Server/Media settings -> Audio-Conf Settings tab you can configure the parameters.

## Known Issues

This version pulls binaries for only Linux 64 and Windows 64 only.

## How to use

Go to https://[your_server]:7443/ohun/[room-id]

The [room-id] could be anything, a simple word is good for a public room
Refresh home page to get a random and anonymous [room-id] each time
You will need a turn server if your Openfire is running inside a container like Docker or behind a NAT. Use the [PionTurn](https://github.com/igniterealtime/openfire-pionturn-plugin/releases) plugin for Openfire or Coturn (linux only). If you use a turn server than also use the [external service discovery](https://github.com/igniterealtime/openfire-externalservicediscovery-plugin) plugin for openfire in order for the web client to discover it.
