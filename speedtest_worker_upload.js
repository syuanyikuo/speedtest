var testStatus = -1
  , dlStatus = ""
  , ulStatus = ""
  , pingStatus = ""
  , jitterStatus = ""
  , clientIp = ""
  , dlProgress = 0
  , ulProgress = 0
  , pingProgress = 0
  , testId = null
  , log = "";
function tlog(s) {
    2 <= settings.telemetry_level && (log += Date.now() + ": " + s + "\n")
}
function tverb(s) {
    3 <= settings.telemetry_level && (log += Date.now() + ": " + s + "\n")
}
function twarn(s) {
    2 <= settings.telemetry_level && (log += Date.now() + " WARN: " + s + "\n"),
    console.warn(s)
}
var settings = {
    test_order: "P_U",
    time_ul_max: 15,
    time_dl_max: 15,
    time_auto: !0,
    time_ulGraceTime: 3,
    time_dlGraceTime: 1.5,
    count_ping: 10,
    url_dl: "garbage.php",
    url_ul: "empty.php",
    url_ping: "empty.php",
    url_getIp: "getIP.php",
    getIp_ispInfo: !0,
    getIp_ispInfo_distance: "km",
    xhr_dlMultistream: 6,
    xhr_ulMultistream: 3,
    xhr_multistreamDelay: 300,
    xhr_ignoreErrors: 1,
    xhr_dlUseBlob: !1,
    xhr_ul_blob_megabytes: 20,
    garbagePhp_chunkSize: 100,
    enable_quirks: !0,
    ping_allowPerformanceApi: !0,
    overheadCompensationFactor: 1.06,
    useMebibits: !1,
    telemetry_level: 0,
    url_telemetry: "telemetry/telemetry.php",
    telemetry_extra: ""
}
  , xhr = null
  , interval = null
  , test_pointer = 0;
function url_sep(url) {
    return url.match(/\?/) ? "&" : "?"
}
function clearRequests() {
    if (tverb("stopping pending XHRs"),
    xhr) {
        for (var i = 0; i < xhr.length; i++) {
            try {
                xhr[i].onprogress = null,
                xhr[i].onload = null,
                xhr[i].onerror = null
            } catch (e) {}
            try {
                xhr[i].upload.onprogress = null,
                xhr[i].upload.onload = null,
                xhr[i].upload.onerror = null
            } catch (e) {}
            try {
                xhr[i].abort()
            } catch (e) {}
            try {
                delete xhr[i]
            } catch (e) {}
        }
        xhr = null
    }
}
this.addEventListener("message", function(e) {
    var params = e.data.split(" ");
    if ("status" === params[0] && postMessage(JSON.stringify({
        testState: testStatus,
        dlStatus: dlStatus,
        ulStatus: ulStatus,
        pingStatus: pingStatus,
        clientIp: clientIp,
        jitterStatus: jitterStatus,
        dlProgress: dlProgress,
        ulProgress: ulProgress,
        pingProgress: pingProgress,
        testId: testId
    })),
    "start" === params[0] && -1 === testStatus) {
        testStatus = 0;
        try {
            var s = {};
            try {
                var ss = e.data.substring(5);
                ss && (s = JSON.parse(ss))
            } catch (e) {
                twarn("Error parsing custom settings JSON. Please check your syntax")
            }
            for (var key in s)
                void 0 !== settings[key] ? settings[key] = s[key] : twarn("Unknown setting ignored: " + key);
            if (settings.enable_quirks || void 0 !== s.enable_quirks && s.enable_quirks) {
                var ua = navigator.userAgent;
                /Firefox.(\d+\.\d+)/i.test(ua) && (void 0 === s.xhr_ulMultistream && (settings.xhr_ulMultistream = 1),
                void 0 === s.xhr_ulMultistream && (settings.ping_allowPerformanceApi = !1)),
                /Edge.(\d+\.\d+)/i.test(ua) && void 0 === s.xhr_dlMultistream && (settings.xhr_dlMultistream = 3),
                /Chrome.(\d+)/i.test(ua) && self.fetch && void 0 === s.xhr_dlMultistream && (settings.xhr_dlMultistream = 5)
            }
            /Edge.(\d+\.\d+)/i.test(ua) && (settings.forceIE11Workaround = !0),
            /PlayStation 4.(\d+\.\d+)/i.test(ua) && (settings.forceIE11Workaround = !0),
            /Chrome.(\d+)/i.test(ua) && /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) && (settings.xhr_ul_blob_megabytes = 4),
            void 0 !== s.telemetry_level && (settings.telemetry_level = "basic" === s.telemetry_level ? 1 : "full" === s.telemetry_level ? 2 : "debug" === s.telemetry_level ? 3 : 0),
            settings.test_order = settings.test_order.toUpperCase()
        } catch (e) {
            twarn("Possible error in custom test settings. Some settings may not be applied. Exception: " + e)
        }
        tverb(JSON.stringify(settings)),
        test_pointer = 0;
        var iRun = !1
          , dRun = !1
          , uRun = !1
          , pRun = !1
          , runNextTest = function() {
            if (5 != testStatus)
                if (test_pointer >= settings.test_order.length)
                    0 < settings.telemetry_level ? sendTelemetry(function(id) {
                        testStatus = 4,
                        null != id && (testId = id)
                    }) : testStatus = 4;
                else
                    switch (settings.test_order.charAt(test_pointer)) {
                    case "D":
                        if (test_pointer++,
                        dRun)
                            return void runNextTest();
                        dRun = !0,
                        testStatus = 1,
                        dlTest(runNextTest);
                        break;
                    case "U":
                        if (test_pointer++,
                        uRun)
                            return void runNextTest();
                        uRun = !0,
                        testStatus = 3,
                        ulTest(runNextTest);
                        break;
                    case "P":
                        if (test_pointer++,
                        pRun)
                            return void runNextTest();
                        pRun = !0,
                        testStatus = 2,
                        pingTest(runNextTest);
                        break;
                    case "_":
                        test_pointer++,
                        setTimeout(runNextTest, 1e3);
                        break;
                    default:
                        test_pointer++
                    }
        };
        runNextTest()
    }
    "abort" === params[0] && (tlog("manually aborted"),
    clearRequests(),
    runNextTest = null,
    interval && clearInterval(interval),
    1 < settings.telemetry_level && sendTelemetry(function() {}),
    testStatus = 5,
    jitterStatus = pingStatus = ulStatus = dlStatus = "")
});
var ipCalled = !1
  , ispInfo = "";
function getIp(done) {
    if (tverb("getIp"),
    !ipCalled) {
        ipCalled = !0;
        var startT = (new Date).getTime();
        (xhr = new XMLHttpRequest).onload = function() {
            tlog("IP: " + xhr.responseText + ", took " + ((new Date).getTime() - startT) + "ms");
            try {
                var data = JSON.parse(xhr.responseText);
                clientIp = data.processedString,
                ispInfo = data.rawIspInfo
            } catch (e) {
                clientIp = xhr.responseText,
                ispInfo = ""
            }
            done()
        }
        ,
        xhr.onerror = function() {
            tlog("getIp failed, took " + ((new Date).getTime() - startT) + "ms"),
            done()
        }
        ,
        xhr.open("GET",settings.url_getIp + url_sep(settings.url_getIp) + (settings.getIp_ispInfo ? "isp=true" + (settings.getIp_ispInfo_distance ? "&distance=" + settings.getIp_ispInfo_distance + "&" : "&") : "&") + "cors=false&" + "r=" + Math.random(), !0),
        xhr.send()
    }
}
var dlCalled = !1;
function dlTest(done) {
    if (tverb("dlTest"),
    !dlCalled) {
        dlCalled = !0;
        var totLoaded = 0
          , startT = (new Date).getTime()
          , bonusT = 0
          , graceTimeDone = !1
          , failed = !1;
        xhr = [];
        for (var testStream = function(i, delay) {
            setTimeout(function() {
                if (1 === testStatus) {
                    tverb("dl test stream started " + i + " " + delay);
                    var prevLoaded = 0
                      , x = new XMLHttpRequest;
                    xhr[i] = x,
                    xhr[i].onprogress = function(event) {
                        if (tverb("dl stream progress event " + i + " " + event.loaded),
                        1 !== testStatus)
                            try {
                                x.abort()
                            } catch (e) {}
                        var loadDiff = event.loaded <= 0 ? 0 : event.loaded - prevLoaded;
                        isNaN(loadDiff) || !isFinite(loadDiff) || loadDiff < 0 || (totLoaded += loadDiff,
                        prevLoaded = event.loaded)
                    }
                    .bind(this),
                    xhr[i].onload = function() {
                        tverb("dl stream finished " + i);
                        try {
                            xhr[i].abort()
                        } catch (e) {}
                        testStream(i, 0)
                    }
                    .bind(this),
                    xhr[i].onerror = function() {
                        tverb("dl stream failed " + i),
                        0 === settings.xhr_ignoreErrors && (failed = !0);
                        try {
                            xhr[i].abort()
                        } catch (e) {}
                        delete xhr[i],
                        1 === settings.xhr_ignoreErrors && testStream(i, 0)
                    }
                    .bind(this);
                    try {
                        settings.xhr_dlUseBlob ? xhr[i].responseType = "blob" : xhr[i].responseType = "arraybuffer"
                    } catch (e) {}
                    xhr[i].open("GET","https://librespeed.a573.net/backend/" + settings.url_dl + url_sep(settings.url_dl) + "cors=false&" +  "r=" + Math.random() + "&ckSize=" + settings.garbagePhp_chunkSize, !0),
                    xhr[i].send()
                }
            }
            .bind(this), 1 + delay)
        }
        .bind(this), i = 0; i < settings.xhr_dlMultistream; i++)
            testStream(i, settings.xhr_multistreamDelay * i);
        interval = setInterval(function() {
            tverb("DL: " + dlStatus + (graceTimeDone ? "" : " (in grace time)"));
            var t = (new Date).getTime() - startT;
            if (graceTimeDone && (dlProgress = (t + bonusT) / (1e3 * settings.time_dl_max)),
            !(t < 200))
                if (graceTimeDone) {
                    var speed = totLoaded / (t / 1e3);
                    if (settings.time_auto) {
                        var bonus = 6.4 * speed / 1e5;
                        bonusT += 800 < bonus ? 800 : bonus
                    }
                    dlStatus = (8 * speed * settings.overheadCompensationFactor / (settings.useMebibits ? 1048576 : 1e6)).toFixed(2),
                    ((t + bonusT) / 1e3 > settings.time_dl_max || failed) && ((failed || isNaN(dlStatus)) && (dlStatus = "Fail"),
                    clearRequests(),
                    clearInterval(interval),
                    dlProgress = 1,
                    tlog("dlTest: " + dlStatus + ", took " + ((new Date).getTime() - startT) + "ms"),
                    done())
                } else
                    t > 1e3 * settings.time_dlGraceTime && (0 < totLoaded && (startT = (new Date).getTime(),
                    totLoaded = bonusT = 0),
                    graceTimeDone = !0)
        }
        .bind(this), 200)
    }
}
var ulCalled = !1;
function ulTest(done) {
    if (tverb("ulTest"),
    !ulCalled) {
        ulCalled = !0;
        var r = new ArrayBuffer(1048576)
          , maxInt = Math.pow(2, 32) - 1;
        try {
            r = new Uint32Array(r);
            for (var i = 0; i < r.length; i++)
                r[i] = Math.random() * maxInt
        } catch (e) {}
        var req = []
          , reqsmall = [];
        for (i = 0; i < settings.xhr_ul_blob_megabytes; i++)
            req.push(r);
        req = new Blob(req),
        r = new ArrayBuffer(262144);
        try {
            r = new Uint32Array(r);
            for (i = 0; i < r.length; i++)
                r[i] = Math.random() * maxInt
        } catch (e) {}
        reqsmall.push(r),
        reqsmall = new Blob(reqsmall);
        var totLoaded = 0
          , startT = (new Date).getTime()
          , bonusT = 0
          , graceTimeDone = !1
          , failed = !1;
        xhr = [];
        var testStream = function(i, delay) {
            setTimeout(function() {
                if (3 === testStatus) {
                    tverb("ul test stream started " + i + " " + delay);
                    var ie11workaround, prevLoaded = 0, x = new XMLHttpRequest;
                    if (xhr[i] = x,
                    settings.forceIE11Workaround)
                        ie11workaround = !0;
                    else
                        try {
                            xhr[i].upload.onprogress,
                            ie11workaround = !1
                        } catch (e) {
                            ie11workaround = !0
                        }
                    if (ie11workaround) {
                        xhr[i].onload = xhr[i].onerror = function() {
                            tverb("ul stream progress event (ie11wa)"),
                            totLoaded += reqsmall.size,
                            testStream(i, 0)
                        }
                        ,
                        xhr[i].open("POST","https://librespeed.a573.net/backend/" + settings.url_ul + url_sep(settings.url_ul) + "cors=false&" + "r=" + Math.random(), !0);
                        try {
                            xhr[i].setRequestHeader("Content-Encoding", "identity")
                        } catch (e) {}
                        try {
                            xhr[i].setRequestHeader("Content-Type", "application/octet-stream")
                        } catch (e) {}
                        xhr[i].send(reqsmall)
                    } else {
                        xhr[i].upload.onprogress = function(event) {
                            if (tverb("ul stream progress event " + i + " " + event.loaded),
                            3 !== testStatus)
                                try {
                                    x.abort()
                                } catch (e) {}
                            var loadDiff = event.loaded <= 0 ? 0 : event.loaded - prevLoaded;
                            isNaN(loadDiff) || !isFinite(loadDiff) || loadDiff < 0 || (totLoaded += loadDiff,
                            prevLoaded = event.loaded)
                        }
                        .bind(this),
                        xhr[i].upload.onload = function() {
                            tverb("ul stream finished " + i),
                            testStream(i, 0)
                        }
                        .bind(this),
                        xhr[i].upload.onerror = function() {
                            tverb("ul stream failed " + i),
                            0 === settings.xhr_ignoreErrors && (failed = !0);
                            try {
                                xhr[i].abort()
                            } catch (e) {}
                            delete xhr[i],
                            1 === settings.xhr_ignoreErrors && testStream(i, 0)
                        }
                        .bind(this),
                        xhr[i].open("POST","https://librespeed.a573.net/backend/" + settings.url_ul + url_sep(settings.url_ul) + "cors=false&" +  "r=" + Math.random(), !0);
                        try {
                            xhr[i].setRequestHeader("Content-Encoding", "identity")
                        } catch (e) {}
                        try {
                            xhr[i].setRequestHeader("Content-Type", "application/octet-stream")
                        } catch (e) {}
                        xhr[i].send(req)
                    }
                }
            }
            .bind(this), 1)
        }
        .bind(this);
        for (i = 0; i < settings.xhr_ulMultistream; i++)
            testStream(i, settings.xhr_multistreamDelay * i);
        interval = setInterval(function() {
            tverb("UL: " + ulStatus + (graceTimeDone ? "" : " (in grace time)"));
            var t = (new Date).getTime() - startT;
            if (graceTimeDone && (ulProgress = (t + bonusT) / (1e3 * settings.time_ul_max)),
            !(t < 200))
                if (graceTimeDone) {
                    var speed = totLoaded / (t / 1e3);
                    if (settings.time_auto) {
                        var bonus = 6.4 * speed / 1e5;
                        bonusT += 800 < bonus ? 800 : bonus
                    }
                    ulStatus = (8 * speed * settings.overheadCompensationFactor / (settings.useMebibits ? 1048576 : 1e6)).toFixed(2),
                    ((t + bonusT) / 1e3 > settings.time_ul_max || failed) && ((failed || isNaN(ulStatus)) && (ulStatus = "Fail"),
                    clearRequests(),
                    clearInterval(interval),
                    ulProgress = 1,
                    tlog("ulTest: " + ulStatus + ", took " + ((new Date).getTime() - startT) + "ms"),
                    done())
                } else
                    t > 1e3 * settings.time_ulGraceTime && (0 < totLoaded && (startT = (new Date).getTime(),
                    totLoaded = bonusT = 0),
                    graceTimeDone = !0)
        }
        .bind(this), 200)
    }
}
var ptCalled = !1;
function pingTest(done) {
    if (tverb("pingTest"),
    !ptCalled) {
        ptCalled = !0;
        var startT = (new Date).getTime()
          , prevT = null
          , ping = 0
          , jitter = 0
          , i = 0
          , prevInstspd = 0;
        xhr = [];
        var doPing = function() {
            tverb("ping"),
            pingProgress = i / settings.count_ping,
            prevT = (new Date).getTime(),
            xhr[0] = new XMLHttpRequest,
            xhr[0].onload = function() {
                if (tverb("pong"),
                0 === i)
                    prevT = (new Date).getTime();
                else {
                    var instspd = (new Date).getTime() - prevT;
                    if (settings.ping_allowPerformanceApi)
                        try {
                            var p = performance.getEntries()
                              , d = (p = p[p.length - 1]).responseStart - p.requestStart;
                            d <= 0 && (d = p.duration),
                            0 < d && d < instspd && (instspd = d)
                        } catch (e) {
                            tverb("Performance API not supported, using estimate")
                        }
                    instspd < 1 && (instspd = prevInstspd),
                    instspd < 1 && (instspd = 1);
                    var instjitter = Math.abs(instspd - prevInstspd);
                    1 === i ? ping = instspd : (ping = instspd < ping ? instspd : .8 * ping + .2 * instspd,
                    jitter = 2 === i ? instjitter : jitter < instjitter ? .3 * jitter + .7 * instjitter : .8 * jitter + .2 * instjitter),
                    prevInstspd = instspd
                }
                pingStatus = ping.toFixed(2),
                jitterStatus = jitter.toFixed(2),
                i++,
                tverb("ping: " + pingStatus + " jitter: " + jitterStatus),
                i < settings.count_ping ? doPing() : (pingProgress = 1,
                tlog("ping: " + pingStatus + " jitter: " + jitterStatus + ", took " + ((new Date).getTime() - startT) + "ms"),
                done())
            }
            .bind(this),
            xhr[0].onerror = function() {
                tverb("ping failed"),
                0 === settings.xhr_ignoreErrors && (jitterStatus = pingStatus = "Fail",
                clearRequests(),
                tlog("ping test failed, took " + ((new Date).getTime() - startT) + "ms"),
                pingProgress = 1,
                done()),
                1 === settings.xhr_ignoreErrors && doPing(),
                2 === settings.xhr_ignoreErrors && (++i < settings.count_ping ? doPing() : (pingProgress = 1,
                tlog("ping: " + pingStatus + " jitter: " + jitterStatus + ", took " + ((new Date).getTime() - startT) + "ms"),
                done()))
            }
            .bind(this),
            xhr[0].open("GET","https://librespeed.a573.net/backend/" + settings.url_ping + url_sep(settings.url_ping) + "cors=false&" +  "r=" + Math.random(), !0),
            xhr[0].send()
        }
        .bind(this);
        doPing()
    }
}
function sendTelemetry(done) {
    if (!(settings.telemetry_level < 1)) {
        (xhr = new XMLHttpRequest).onload = function() {
            try {
                var parts = xhr.responseText.split(" ");
                if ("id" == parts[0])
                    try {
                        var id = parts[1];
                        done(id)
                    } catch (e) {
                        done(null)
                    }
                else
                    done(null)
            } catch (e) {
                done(null)
            }
        }
        ,
        xhr.onerror = function() {
            console.log("TELEMETRY ERROR " + xhr.status),
            done(null)
        }
        ,
        xhr.open("POST","https://librespeed.a573.net/backend/" + settings.url_telemetry + url_sep(settings.url_telemetry) + "r=" + Math.random(), !0);
        var telemetryIspInfo = {
            processedString: clientIp,
            rawIspInfo: "object" == typeof ispInfo ? ispInfo : ""
        };
        try {
            var fd = new FormData;
            fd.append("ispinfo", JSON.stringify(telemetryIspInfo)),
            fd.append("dl", dlStatus),
            fd.append("ul", ulStatus),
            fd.append("ping", pingStatus),
            fd.append("jitter", jitterStatus),
            fd.append("log", 1 < settings.telemetry_level ? log : ""),
            fd.append("extra", settings.telemetry_extra),
            xhr.send(fd)
        } catch (ex) {
            var postData = "extra=" + encodeURIComponent(settings.telemetry_extra) + "&ispinfo=" + encodeURIComponent(JSON.stringify(telemetryIspInfo)) + "&dl=" + encodeURIComponent(dlStatus) + "&ul=" + encodeURIComponent(ulStatus) + "&ping=" + encodeURIComponent(pingStatus) + "&jitter=" + encodeURIComponent(jitterStatus) + "&log=" + encodeURIComponent(1 < settings.telemetry_level ? log : "");
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"),
            xhr.send(postData)
        }
    }
}
