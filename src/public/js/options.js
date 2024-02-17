document.getElementById('option-fullscreen').addEventListener('click', e => {
	if (document.fullscreenElement) {
		return document.exitFullscreen();
	}
	const element = document.documentElement;
	if (element.requestFullscreen) {
		element.requestFullscreen();
	}
});

document.addEventListener("fullscreenchange", () => {
	document.getElementById('option-fullscreen').checked = !!document.fullscreenElement;
});