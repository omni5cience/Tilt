var enabled = false, calibration = 0, ports = {};
function calibrate(callback){
	// Work around http://crbug.com/116546
	var first = true;
	window.addEventListener('deviceorientation', function handleCalibrate(e){
		if (first) {
			first = false;
		} else {
			callback(e.beta);
			window.removeEventListener('deviceorientation', handleCalibrate);
		}
	}, false);
}

function getConfig(){
	return { deadZone: +localStorage.deadZone, smoothness: +localStorage.smoothness };
}

function updateBadge(){
	chrome.browserAction.setIcon({ path: 'icons/tilt-19' + (enabled ? '-enabled' : '') + '.png' });
	chrome.browserAction.setTitle({ title: 'Turn ' + (enabled ? 'off' : 'on') + ' tilt scrolling' });
}

function broadcast(message){
	for (var id in ports){
		ports[id].postMessage(message);
	}
}

updateBadge();
chrome.browserAction.onClicked.addListener(function(){
	enabled = !enabled;
	updateBadge();
	if (enabled){
		calibrate(function(value){
			calibration = value;
			broadcast({ enabled: true, calibration: value });
		});
	} else {
		broadcast({ enabled: false });
	}
});
chrome.extension.onConnect.addListener(function(port){
	ports[port.sender.tab.id] = port;
	port.postMessage({ active: port.tab.active, enabled: enabled, calibration: calibration, config: getConfig() });
	port.onDisconnect.addListener(function(){
		delete ports[port.sender.tab.id];
	});
});

window.addEventListener('storage', function(e){
	broadcast({ config: getConfig() });
}, false);

// Default options. I think this (populating localstorage)
// is a shitty way of doing defaults, but it’ll work for now
if (!('deadZone' in localStorage)){
	localStorage.deadZone = 1.5;
}
if (!('smoothness' in localStorage)){
	localStorage.smoothness = 4;
}
