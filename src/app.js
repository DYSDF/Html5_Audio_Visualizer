/**
 * Created by Jay on 2017/4/7.
 */

var fileEl = document.querySelector("#file");
var audioEl = document.querySelector("#audio");
var canvasEl = document.querySelector("#canvas");

var visualizer = new AudioVisualizer(audioEl, canvasEl)

fileEl.addEventListener("change", function (e) {
    visualizer.stop();
    if (this.files && this.files.length){
        audioEl.src = window.URL.createObjectURL(this.files[0]);
    } else {

    }
});

audioEl.addEventListener("play", function () {
    visualizer.start();
});