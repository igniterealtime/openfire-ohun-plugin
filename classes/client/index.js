var xpc = null, creds = {}, candidates = [], username, ucid = "", rname, rnameRPC, unameRPC;

window.onbeforeunload = function(event)
{
    if (xpc) xpc.close();

    if (ucid && rname && rnameRPC && unameRPC)
    {
        event.preventDefault();

        const room = rname + '@conference.' + location.hostname;
        const body = JSON.stringify({id: room, method: 'end', params: [rnameRPC, unameRPC, ucid]});
        window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));

        event.returnValue = '';
        return event.returnValue;
    }
};

window.onload = function() {

  const micIcon = '🎤', muteIcon = '🔇';
  const partyIcon = '🔇', performIcon = '🗣';

  var uid = localStorage.getItem('uid');
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem('uid', uid);
  }

  var paths = location.pathname.split('/');
  rname = paths[paths.length - 1];

  if (!rname || rname.trim() === '') {
    var newRoom = uuidv4();
    document.querySelector('.room.random').innerHTML = "<a href='" + location.protocol + "//" + location.host + "/ohun/" + newRoom + "'>" + newRoom + "</a>";
    document.getElementById('invalid').style.display = 'block';
    return;
  }

  var name = username = localStorage.getItem(rname+':'+uid);
  if (!name || name === '') {
    document.getElementById('form').style.display = 'block';

    document.getElementById('name-submit').onclick = function () {
      var val = document.querySelector('input[name="name"]').value;
      if (!val || val.trim() === '') {
        alert('name can not be empty');
      } else if (val.length > 32) {
        alert('name too long, at most 32 characters');
      } else {
        localStorage.setItem(rname+':'+uid, val);
        window.location.reload(false);
      }
    };
    return;
  }

  rnameRPC = encodeURIComponent(rname);
  unameRPC = encodeURIComponent(btoa(JSON.stringify({room: rname + "@conference." + location.hostname, jid: uid, nick: name})));

  var visulizers = {};
  window.onresize = function() {
    resizeVisulizers();
  };
  function resizeVisulizers() {
    const COL2 = 10;
    var ww = window.innerWidth;
    var wh = window.innerHeight;
    var peers = document.querySelectorAll('.peer');
    var num = peers.length;
    var width = ww;
    var height = wh / num;
    if (num > COL2) {
      width = ww / 2;
      height = wh / Math.ceil(num / 2);
    }
    peers.forEach((peer) => {
      var canvas = peer.querySelector('canvas');
      peer.style.width = `${width}px`;
      peer.style.height = `${height}px`;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
    })
    if (num > COL2 && num % 2 == 1) {
      var peer = peers[num - 1];
      var canvas = peer.querySelector('canvas');
      peer.style.width = `${width * 2}px`;
      canvas.width = width * 2;
    }
    if (peers.length == 1) {
      document.getElementById('overlay').style.display = 'block';
    } else {
      document.getElementById('overlay').style.display = 'none';
    }
  }

  const constraints = {
    audio: true,
    video: false
  };
  const configuration = {
    iceServers: [],
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
  };

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();

  function getStunTurn()
  {
    window.connection.sendIQ($iq({type: 'get', to: window.connection.domain}).c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + window.connection.domain}), function (res)
    {
        console.debug('getStunTurn - getStunAndTurnCredentials', res);
        configuration.iceServers = [];

        res.querySelectorAll('service').forEach(function (el)
        {
            console.debug('getStunTurn - getStunAndTurnCredentials - item', el);
            var dict = {};

            switch (el.getAttribute('type'))
            {
            case 'stun':
                dict.url = 'stun:' + el.getAttribute('host');
                if (el.getAttribute('port')) {
                    dict.url += ':' + el.getAttribute('port');
                }
                configuration.iceServers.push(dict);
                break;
            case 'turn':
                dict.url = 'turn:';

                if (el.getAttribute('username')) {
                    dict.username = el.getAttribute('username');
                }
                dict.url += el.getAttribute('host');

                if (el.getAttribute('port')) {
                    dict.url += ':' + el.getAttribute('port');
                }
                if (el.getAttribute('transport')) {
                    dict.url += '?transport=' + el.getAttribute('transport');
                }
                if (el.getAttribute('password')) {
                    dict.credential = el.getAttribute('password');
                }
                configuration.iceServers.push(dict);
                break;
            }
        });

        if (configuration.iceServers.length > 0)
        {
            configuration.iceTransportPolicy = 'relay';
            console.debug('getStunTurn - getStunAndTurnCredentials - config', configuration);
        }
        start();

    }, function (err) {
        console.warn('getting turn credentials failed', err);
        start();
    });
  }


  function startXMPP()
  {
    const protocol = (location.protocol.startsWith("https")) ? "wss:" : "ws:";
    window.connection = new Strophe.Connection(protocol + "//" + location.host + "/ws/");

    const jid = creds.username ? creds.username + "@" + location.hostname : location.hostname;
    const password = creds.password ? creds.password : null;

    window.connection.connect(jid, password, function (status)
    {
        console.log("XMPPConnection.connect", status);

        if (status === Strophe.Status.CONNECTED)
        {
            uid = Strophe.getBareJidFromJid(window.connection.jid);
            unameRPC = encodeURIComponent(btoa(JSON.stringify({room: rname + "@conference." + location.hostname, jid: uid, nick: name})));

            window.connection.send($pres());
            window.connection.send($pres({to: rname + '@conference.' + location.hostname + '/' + username}).c("x",{xmlns: Strophe.NS.MUC}));
            getStunTurn();
        }
        else

        if (status === Strophe.Status.DISCONNECTED)
        {
           setTimeout(function() {location.reload()}, 1000);
        }
    });

    window.connection.addHandler(function (message)
    {
        const json_ele = message.querySelector("json");
        const json = JSON.parse(json_ele.innerHTML);

        const id = Strophe.getBareJidFromJid(json_ele.getAttribute("jid"));
        const json_type = json_ele.getAttribute("type");
        if (json_type != "response") return true;

        const room = rname + '@conference.' + location.hostname;
        console.log("Ohun Message", json_type, id, json.id, json);

        async function handleAnswer(json)
        {
            console.log("handleAnswer", json);
            ucid = json.data.track;
            await xpc.setRemoteDescription(json.data.sdp);

            if (candidates)
            {
                for (let i=0; i<candidates.length; i++)
                {
                    console.log("handleAnswer - candidate", candidates[i]);
                    const body = JSON.stringify({id: room, method: 'trickle', params: [rnameRPC, unameRPC, ucid, JSON.stringify(candidates[i])]});
                    window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));
                }
            }
        }

        function subscribe()
        {
            console.log("listenForOhunEvents - subscribe", room);
            const body = JSON.stringify({id: room, method: 'subscribe', params: [rnameRPC, unameRPC, ucid]})
            window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));
        }

        async function handleOffer(json)
        {
            console.log("handleOffer", json);
            await xpc.setRemoteDescription(json.data);
            var sdp = await xpc.createAnswer();
            await xpc.setLocalDescription(sdp);
            const body = JSON.stringify({id: room, method: 'answer', params: [rnameRPC, unameRPC, ucid, JSON.stringify(sdp)]});
            window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));
        }

        if (json.data && json.data.sdp)
        {
            if (json.data.sdp.type === 'answer')
            {
                if (uid == id) handleAnswer(json);
                setTimeout(subscribe, 1000);
            }
            else

            if (json.data.type === 'offer' && uid == id)
            {
                handleOffer(json);
            }
        }

        return true;

    }, "urn:xmpp:json:0", 'message');
  }

  async function init() {

    async function getCreds()
    {
        try {
          const response = await fetch(location.protocol + '//' + location.host + '/ohun/credentials.jsp?room=' + rname, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
          });
          return response.json();
        } catch (err) {
          console.log('init fetch error', err);
        }
    }

    creds = await getCreds();

    if (creds.username && creds.username != "")
    {
        uid = creds.username + "@" + location.hostname;
        unameRPC = encodeURIComponent(btoa(JSON.stringify({room: rname + "@conference." + location.hostname, jid: uid, nick: name})));
    }

    console.log("credentials", creds.username, uid);
    startXMPP();
  }

  init();


  async function start() {
    try {
      document.querySelectorAll('.peer').forEach((el) => el.remove());

      var pc = new RTCPeerConnection(configuration);
      xpc = pc;
      pc.createDataChannel('useless'); // FIXME remove this line

      pc.onicecandidate = ({candidate}) => {
        console.log("candidate", candidate);

        if (candidate)
        {
            if (ucid)
            {
                const room = rname + '@conference.' + location.hostname;
                const body = JSON.stringify({id: room, method: 'trickle', params: [rnameRPC, unameRPC, ucid, JSON.stringify(candidate)]});
                window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));
            }
            else {
                candidates.push(candidate);
            }
        }
      };

      pc.ontrack = (event) => {
        console.log("ontrack", event);

        var stream = event.streams[0];
        var sid = JSON.parse(atob(decodeURIComponent(stream.id)));
        const name = sid.nick;
        const id = sid.jid;
        console.log(id, uid);

        if (id === uid) {
          return;
        }

        event.track.onmute = (event) => {
          console.log("onmute", event);
          var el = document.querySelector(`[data-track-id="${event.target.id}"]`);
          if (el) {
            el.remove();
            resizeVisulizers();
          }
        };

        var aid = 'peer-audio-'+id;
        var el = document.getElementById(aid);
        if (el) {
          el.srcObject = stream;
        } else {
          el = document.createElement(event.track.kind)
          el.id = aid;
          el.srcObject = stream;
          el.autoplay = true;
          el.controls = false;
          document.getElementById('peers').appendChild(el)
        }

        buildCanvas(stream, id, name, event.track.id);
        resizeVisulizers();
      };

      var stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        document.getElementById('microphone').style.display = 'block';
        console.error(err);
        return;
      }
      buildCanvas(stream, uid, name, 'me');
      resizeVisulizers();
      handlePartyPerform();
      audioCtx.resume();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      await pc.setLocalDescription(await pc.createOffer());
      const room = rname + '@conference.' + location.hostname;
      const body = JSON.stringify({id: room, method: 'publish', params: [rnameRPC, unameRPC, JSON.stringify(pc.localDescription)]})
      window.connection.send($msg({type: 'groupchat', to: room}).c("json",{xmlns: "urn:xmpp:json:0", type: "request"}).t(body));

    } catch (err) {
      console.error(err);
    }
    return pc;
  }

  function handlePartyPerform() {
    document.querySelectorAll('.footer').forEach((el) => el.style.display = 'inline-block');
    var el = document.querySelector('.party.action,.perform.action');
    el.onclick = (event) => {
      if (el.className == 'footer party action') {
        el.className = 'footer perform action';
        el.innerHTML = performIcon;
        document.querySelectorAll('.peer').forEach((peer) => {
          var ae = peer.querySelector('.action');
          var id = ae.getAttribute('data-peer-id');
          if (id === uid) {
            return;
          }
          ae.className = 'unmute action';
          ae.innerHTML = muteIcon;
          var vi = visulizers[id];
          if (vi && vi.stream && vi.stream.getTracks().length > 0) {
            vi.stream.getTracks()[0].enabled = false;
          }
        });
      } else if (el.className == 'footer perform action') {
        el.className = 'footer party action';
        el.innerHTML = partyIcon;
        document.querySelectorAll('.peer').forEach((peer) => {
          var ae = peer.querySelector('.action');
          var id = ae.getAttribute('data-peer-id');
          if (id === uid) {
            return;
          }
          ae.className = 'mute action';
          ae.innerHTML = micIcon;
          var vi = visulizers[id];
          if (vi && vi.stream && vi.stream.getTracks().length > 0) {
            vi.stream.getTracks()[0].enabled = true;
          }
        });
      }
    };
  }

  function buildCanvas(stream, id, name, tid) {
    var old = document.getElementById(`peer-${id}`);
    var peer = htmlToElement(`<div class="peer" id="peer-${id}" data-track-id="${tid}"><canvas id="canvas-${id}"></canvas><div class="info"><span class="mute action" data-peer-id="${id}">${micIcon}</span><span class="name">${name}</span></div></div>`)
    if (old) {
      old.replaceWith(peer);
    } else {
      document.getElementById('peers').prepend(peer)
    }
    visulizers[id] = { stream: stream }

    var canvas = document.getElementById(`canvas-${id}`);
    var el = peer.querySelector('.mute.action,.unmute.action');
    if (stream.getTracks().length > 0 && !stream.getTracks()[0].enabled) {
      el.className = 'unmute action';
      el.innerHTML = muteIcon;
    }
    el.onclick = (event) => {
      var el = event.target;
      var id = el.getAttribute('data-peer-id');
      var vi = visulizers[id];
      if (el.className == 'mute action') {
        el.className = 'unmute action';
        el.innerHTML = muteIcon;
        if (vi && vi.stream && vi.stream.getTracks().length > 0) {
          vi.stream.getTracks()[0].enabled = false;
        }
      } else {
        el.className = 'mute action';
        el.innerHTML = micIcon;
        if (vi && vi.stream && vi.stream.getTracks().length > 0) {
          vi.stream.getTracks()[0].enabled = true;
        }
      }
    };

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.minDecibels = -80;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    visualize(id, canvas, analyser, tid);
  }

  function visualize(id, canvas, analyser, tid) {
    var canvasCtx = canvas.getContext("2d");
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Float32Array(bufferLength);
    var gb = uuidToColor(id);
    var g = gb[0], b = gb[1];
    var MIN = 7;

    function draw() {
      var WIDTH = canvas.width;
      var HEIGHT = canvas.height;

      analyser.getFloatFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight, point, x = 0;

      for (var i = 0; i < bufferLength; i++) {
        point = dataArray[i];
        barHeight = (point + 140)*2;

        var r = Math.floor(barHeight + 64);
        if (g % 3 === 0) {
          canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
        } else if (g % 3 === 1) {
          canvasCtx.fillStyle = `rgb(${g},${r},${b})`;
        } else {
          canvasCtx.fillStyle = `rgb(${g},${b},${r})`;
        }

        barHeight = HEIGHT / MIN + barHeight / 256 * HEIGHT * (MIN - 1) / MIN;
        if (barHeight < HEIGHT / MIN) {
          barHeight = HEIGHT / MIN;
        }
        canvasCtx.fillRect(x,HEIGHT-barHeight,barWidth,barHeight);

        x += barWidth + 1;
      }

      var el = document.getElementById('peer-'+id);
      if (el && el.getAttribute('data-track-id') === tid) {
        setTimeout(function () {
          requestAnimationFrame(draw);
        }, 50)
      }
    };

    draw();
  }

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }

  function uuidToColor(id) {
    var g = 0, b = 0;
    for (var i = 0; i < id.length/2; i++) {
      var code = id.charCodeAt(i);
      g = g + code;
      code = id.charCodeAt(i*2);
      b = b + code;
    }
    return [g % 256, b % 256];
  }

  function getUrlParam(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

};
