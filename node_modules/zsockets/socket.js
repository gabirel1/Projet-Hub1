const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const RandStr = (length) => {
    let text = "";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

class Server {
    constructor(port, cb)
    {
        const net = require("net");
        
        this.events = [];

        //Usual events
        this.events["connection"] = [];
        this.events["error"] = [];
        this.events["disconnected"] = [];
        this.events["cerror"] = [];

        this.clients = [];

        //Creating the server
        this.server = net.createServer((c) => {
            c.id = Math.floor(Math.random() * 1000);
            this.clients[c.id] = new ServerClient(c);

            this.InternalEvent("connection", this.clients[c.id]);
        });

        this.server.listen(port);

        this.server.on("error", (err) => {
            this.InternalEvent("error", err);
        });

        this.OnInternal("connection", (c) => {
            c.c.on("end", () => {
                this.InternalEvent("disconnected", this.clients[c.id]);

                this.clients.splice(c.id, 1);
            });

            c.c.on("error", (err) => {
                if (err.message.includes('ECONNRESET')) //Error which happends when the client exists randomly so yeah we handle it as disconnection
                    this.InternalEvent("disconnected", this.clients[c.id]);
                else
                    this.InternalEvent("cerror", err);
            });

            c.c.on("data", (data) => {
                const decode = JSON.parse(data);

                c.Internal(decode.n, decode.obj)
            });
        });

        if (cb)
            cb();
    }

    InternalEvent(n, ...args)
    {
        if (this.events[n])
        {
            for (let i = 0; i < this.events[n].length; i++)
                if (this.events[n][i])
                    this.events[n][i](...args);
                else
                    return;
        }
    }

    OnInternal(n, cb)
    {
        if (this.events[n])
        {
            this.events[n][this.events[n].length] = cb;
        }
        else
        {
            this.events[n] = [];
            this.events[n][this.events[n].length] = cb;
        }
    }

    EmitToAll(n, obj)
    {
        this.clients.forEach((e) => {
            e.Emit(n, obj);
        });
    }
};

class ServerClient {
    constructor(c)
    {
        this.c = c;
        this.ip = c.remoteAddress;
        this.id = c.id;

        this.events = [];
    }

    Emit(n, obj)
    {
        this.c.write(JSON.stringify({n: n, obj: obj}), "utf-8");
    }

    Internal(n, obj)
    {
        if (this.events[n])
        {
            for (let i = 0; i < this.events[n].length; i++)
                if (this.events[n][i])
                    this.events[n][i](obj);
                else
                    return;
        }
    }

    On(n, cb)
    {
        if (this.events[n])
        {
            this.events[n][this.events[n].length] = cb;
        }
        else
        {
            this.events[n] = [];
            this.events[n][this.events[n].length] = cb;
        }
    }
}

class Client {
    constructor(ip, port)
    {
        const net = require("net");
        
        this.events = [];

        this.events["connect"] = [];
        this.events["disconnect"] = [];

        this.client = new net.Socket();

        this.client.connect(port, ip);

        this.client.on("connect", () => {
            this.Event("connect", {});
        });

        this.client.on("end", () => {
            this.Event("disconnect", {});
        })

        this.client.on("data", (data) => {
            const dec = JSON.parse(data);

            this.Event(dec.n, dec.obj);
        });
    }

    Event(n, obj)
    {
        if (this.events[n])
        {
            for (let i = 0; i < this.events[n].length; i++)
                if (this.events[n][i])
                    this.events[n][i](obj);
                else
                    return;
        }
    }

    On(n, cb)
    {
        if (this.events[n])
        {
            this.events[n][this.events[n].length] = cb;
        }
        else
        {
            this.events[n] = [];
            this.events[n][this.events[n].length] = cb;
        }
    }

    Emit(n, obj)
    {
        this.client.write(JSON.stringify({n: n, obj: obj}), "utf-8");
    }
};

WsWriteSock = function(socket, data, binary, closed)
{
    const enc = binary ? 'binary' : 'utf8';
    const length = Buffer.byteLength(data, enc) + (0);

    var buffer;
    var bytes = 2;

    if (length > 0xffff) //64
    {
        var low = length | 0;
        var hi = (length - low) / 4294967296;

        buffer = new Buffer(10 + length);
        buffer[1] = 127;

        buffer[2] = (hi >> 24) & 0xff;
        buffer[3] = (hi >> 16) & 0xff;
        buffer[4] = (hi >> 8) & 0xff;
        buffer[5] = hi & 0xff;

        buffer[6] = (low >> 24) & 0xff;
        buffer[7] = (low >> 16) & 0xff;
        buffer[8] = (low >> 8) & 0xff;
        buffer[9] = low & 0xff;

        bytes += 8;
    }
    else if (length > 125) //16
    {
        buffer = new Buffer(4 + length);
        buffer[1] = 126;

        buffer[2] = (length >> 8) & 0xff;
        buffer[3] = length & 0xff;

        bytes += 2;
    }
    else
    {
        buffer = new Buffer(2 + length);
        buffer[1] = length;
    }

    buffer[0] = 128 + (closed ? 8 : (binary ? 2 : 1));
    buffer[1] &= ~128;

    buffer.write(data, bytes, enc);
    socket.write(buffer);
};

class WebSocketServer {
    constructor(port, cb)
    {
        const http = require("http");
        const crypto = require('crypto');

        this.clients = [];
        this.events = [];

        //Usual events
        this.events["connection"] = [];
        this.events["error"] = [];
        this.events["disconnected"] = [];
        this.events["cerror"] = [];

        const server = new http.Server();
        server.listen(port);

        function GetWebSocketHeaders(heads)
        {
            var headers = {
                host: heads.host,
                origin: heads.origin,
                version: +heads.version || -1
            };

            for (let i in heads)
            {
                if (i.substring(0, 14) === "sec-websocket-")
                {
                    headers[i.substring(14)] = heads[i];
                }
            }

            return headers;
        };

        function GetWebSocketHandshake(req, head)
        {
            function pack32(value)
            {
                return String.fromCharCode(value >> 24 & 0xFF)
                       + String.fromCharCode(value >> 16 & 0xFF)
                       + String.fromCharCode(value >> 8 & 0xFF)
                       + String.fromCharCode(value & 0xFF);
            }

            var handshake = {
                version: -1,
                headers: null,
                body: ''
            };

            var headers = GetWebSocketHeaders(req.headers);

            if (headers.version !== -1 && 'origin' in headers)
            {
                var sha1 = crypto.createHash('sha1');
                sha1.update(headers.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');

                handshake.version = 13;
                handshake.headers = {
                    'Sec-WebSocket-Version': headers.version,
                    'Sec-WebSocket-Origin': headers.origin,
                    'Sec-WebSocket-Accept': sha1.digest('base64')
                };
            }
            else
            {
                var md5 = crypto.createHash('md5');

                if ('key1' in headers && 'key2' in headers)
                {
                    let k = headers.key1;
                    let l = headers.key2;
                    let a = parseInt(k.replace(/[^\d]/g, ''), 10);
                    let b = parseInt(l.replace(/[^\d]/g, ''), 10);
                    let u = k.replace(/[^\ ]/g, '').length;
                    let o = l.replace(/[^\ ]/g, '').length;

                    if (!(u === 0 || o === 0 || a % u !== 0 || b % o !== 0))
                    {
                        md5.update(pack32(parseInt(a / u, 10)));
                        md5.update(pack32(parseInt(b / o, 10)));
                        md5.update(head.toString('binary'));

                        handshake.version = 6;
                        handshake.body = md5.digest('binary');
                        handshake.headers = {
                            'Sec-WebSocket-Origin': headers.origin,
                            'Sec-WebSocket-Location': 'ws://' + headers.host + '/'
                        };
                    }
                }
                else
                {
                    handshake.version = 6;
                    handshake.body = md5.digest('binary');

                    handshake.headers = {
                        'WebSocket-Origin': headers.origin,
                        'WebSocket-Location': 'ws://' + headers.host + '/'
                    };
                }
            }

            return handshake;
        }

        function CheckUpgrade(req)
        {
            var headers = req.headers;
            return req.method === 'GET'
                    && headers.hasOwnProperty('upgrade')
                    && headers.hasOwnProperty('connection')
                    && headers.upgrade.toLowerCase() === 'websocket'
                    && headers.connection.toLowerCase().indexOf('upgrade') !== -1;
        };

        server.on("upgrade", (req, sock, heads) => {
            const handshake = GetWebSocketHandshake(req, heads);

            if (!CheckUpgrade(req))
                return false;

            if (handshake.version !== -1)
            {
                var data = 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n'
                        + 'Upgrade: WebSocket\r\n'
                        + 'Connection: Upgrade\r\n';

                for (let i in handshake.headers)
                {
                    if (handshake.headers.hasOwnProperty(i))
                    {
                        data += i + ': ' + handshake.headers[i] + '\r\n';
                    }
                }

                data += '\r\n' + handshake.body;

                sock.write(data, 'utf-8');

                sock.setTimeout(0);
                sock.setNoDelay(true);
                sock.setKeepAlive(true, 0);
                sock.removeAllListeners('timeout');

                sock.id = Math.floor(Math.random() * 1000);
                this.clients[sock.id] = new WebSocketClient(sock);
                this.Event("connection", this.clients[sock.id]);

                sock.on("data", (data) => {
                    var dtjs = "";

                    try
                    {
                        dtjs = JSON.parse(this.GetMessage(data, this.GetProtocol(data)));
                        this.clients[sock.id].Event(dtjs.n, dtjs.obj);
                    }
                    catch (err)
                    {
                        //
                    }
                });
                
                sock.on("end", () => {
                    this.Event("disconnected", this.clients[sock.id]);

                    this.clients.splice(sock.id, 1);
                });
            }
        });

        if (cb)
            cb();
    }

    GetOneBit(data, hex)
    {
        return (data & hex) == hex ? 1 : 0;
    };

    GetProtocol(data)
    {
        var protocol = {
            start : 2,
            msg : ''
        };

        protocol.fin = this.GetOneBit(data[0], 0x80);
        protocol.rsv1 = this.GetOneBit(data[0], 0x40);
        protocol.rsv2 = this.GetOneBit(data[0], 0x20);
        protocol.rsv3 = this.GetOneBit(data[0], 0x10);

        if (protocol.rsv1 != 0 || protocol.rsv2 != 0 || protocol.rsv3 != 0)
            return false;

        protocol.opcode = data[0] & 0x0f;

        protocol.mask = this.GetOneBit(data[1], 0x80);
        protocol.payload_len = data[1] & 0x7f;

        if (protocol.payload_len >= 0 && protocol.payload_len <= 125)
        {
            protocol.len = protocol.payload_len;
        }
        else if (protocol.payload_len == 126)
        {
            protocol.start += 2;
            protocol.len = (data[2] << 8) + data[3];
        }
        else if (protocol.payload_len == 127)
        {
            if (data[2] != 0 || data[3] != 0 || data[4] != 0 || data[5] != 0)
                return false;

            protocol.start += 8;
            protocol.len = data.readUInt32BE(6);
        }
        else
        {
            return false;
        }

        if (protocol.mask)
        {
            protocol.mask_key = data.slice(protocol.start, protocol.start + 4);
            protocol.start += 4;
        }
        else
        {
            return false;
        }

        return protocol;
    };

    GetMessage(data, protocol)
    {
        var buflen = data.length - protocol.start;

        if (buflen > protocol.len)
        {
            buflen = protocol.len;
            protocol.data = data.slice(buflen);
            protocol.sliced = true;
        }
        else
        {
            protocol.sliced = false;
        }

        var buffer = new Buffer(buflen);

        for (var i = protocol.start, j = 0, k = protocol.msg.length; i < data.length; i++, j++, k++)
        {
            buffer[j] = data[i] ^ protocol.mask_key[k % 4];
        }

        protocol.len = protocol.len - buflen;
        protocol.start = 0;

        protocol.msg += buffer.toString();

        return protocol.msg;
    };

    OnInternal(n, cb)
    {
        if (this.events[n])
        {
            this.events[n][this.events[n].length] = cb;
        }
        else
        {
            this.events[n] = [];
            this.events[n][this.events[n].length] = cb;
        }
    }

    Event(n, obj)
    {
        if (this.events[n])
        {
            for (let i = 0; i < this.events[n].length; i++)
                if (this.events[n][i])
                    this.events[n][i](obj);
                else
                    return;
        }
    }

    EmitToAll(n, obj)
    {
        this.clients.forEach((e) => {
            e.Emit(n, obj);
        });
    }
}

class WebSocketClient {
    constructor(c)
    {
        this.c = c;
        this.ip = c.ip;
        this.events = [];
    }

    Event(n, obj)
    {
        if (this.events[n])
        {
            for (let i = 0; i < this.events[n].length; i++)
                if (this.events[n][i])
                    this.events[n][i](obj);
                else
                    return;
        }
    }

    On(n, cb)
    {
        if (this.events[n])
        {
            this.events[n][this.events[n].length] = cb;
        }
        else
        {
            this.events[n] = [];
            this.events[n][this.events[n].length] = cb;
        }
    }

    Emit(n, obj)
    {
        WsWriteSock(this.c, JSON.stringify({n: n, obj: obj}));
    }
}

module.exports = {
    Server: Server,
    Client: Client,
    WebSocketServer: WebSocketServer
};
