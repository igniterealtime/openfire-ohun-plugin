# Ohùn Plugin for openfire

<table><tr>
<td>
<p>Ohùn is the Yoruba word for voice and is a simple audio conferencing solution for Openfire using the Kraken WebRTC <a href=https://github.com/MixinNetwork/kraken>client</a> and <a href=https://github.com/MixinNetwork/kraken.fm>server</a>.</p>

<p>It is for remote teams who will use it everyday to communicate and collaborate all day long without the need to show their faces or any other video. With the absence of video, it ensures high quality audio for the conversation at most times, even with more than 10 participants.</p>
</td>
<td><img width="70%" src="https://github.com/igniterealtime/openfire-ohun-plugin/raw/master/ohun.png" /></td>
</tr></table>

## Installation

- Copy the [ohun.jar](https://github.com/igniterealtime/openfire-ohun-plugin/releases/download/v0.0.1/ohun.jar) file to the OPENFIRE_HOME/plugins directory.
- Configure the admin properties page.

<img src=https://user-images.githubusercontent.com/110731/93486376-0787aa80-f8fc-11ea-8c73-e1fb622fe157.png />


## Configuration

Under Server/Media settings -> Audio-Conf Settings tab you can configure the parameters.

<img src=https://user-images.githubusercontent.com/110731/93486413-12dad600-f8fc-11ea-9933-b3fa3043aaf8.png />

## Known Issues

This version pulls binaries for only Linux 64 and Windows 64 only.

## How to use

Go to https://[your_server]:7443/ohun/[room-id]

The [room-id] could be anything, a simple word is good for a public room
Refresh home page to get a random and anonymous [room-id] each time
You will need a turn server if your Openfire is running inside a container like Docker or behind a NAT. Use the [PionTurn](https://github.com/igniterealtime/openfire-pionturn-plugin/releases) plugin for Openfire or Coturn (linux only). 

If you use a turn server then also use the [external service discovery](https://github.com/igniterealtime/openfire-externalservicediscovery-plugin) plugin for openfire in order for the web client to discover it.

## CI Build Status

[![Build Status](https://github.com/igniterealtime/openfire-ohun-plugin/workflows/Java%20CI/badge.svg)](https://github.com/igniterealtime/openfire-ohun-plugin/actions)

## Reporting Issues

Issues may be reported to the [forums](https://discourse.igniterealtime.org) or via this repo's [Github Issues](https://github.com/igniterealtime/openfire-ohun-plugin).

