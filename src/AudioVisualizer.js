/**
 * Created by Jay on 2017/4/6.
 */

(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        global.AudioVisualizer = factory();
    }
})(this, function () {
    // Audio 分析器
    function AudioAnalyser(audioEl, analyserCount, fftIndex) {
        var audioContext = new AudioContext(),
            audioBufferSource = audioContext.createMediaElementSource(audioEl),
            audioAnalyserList = [],
            audioSplitter = audioContext.createChannelSplitter(analyserCount),
            audioMerger = audioContext.createChannelMerger(analyserCount);

        // 创建分析器列表
        for (var i = 0; i < analyserCount; i++) {
            var analyser = audioContext.createAnalyser();
            analyser.fftSize = Math.pow(2, fftIndex);
            audioAnalyserList.push(analyser);
        }

        // 连接 Audio 节点
        audioBufferSource.connect(audioSplitter);
        audioAnalyserList.forEach(function (analyser, index) {
            audioSplitter.connect(analyser, index);
            analyser.connect(audioMerger, 0, index);
        });
        audioMerger.connect(audioContext.destination);

        // 获取分析器数据方法
        function getByteFrequencyDataList() {
            var arrayBuffer;
            return audioAnalyserList.map(function (analyser) {
                arrayBuffer = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(arrayBuffer);
                return arrayBuffer;
            });
        }

        function getByteFrequencyDataCount() {
            var count = 0;
            audioAnalyserList.forEach(function (analyser) {
                count += analyser.frequencyBinCount;
            });
            return count;
        }

        return {
            getByteFrequencyDataList: getByteFrequencyDataList,
            getByteFrequencyDataCount: getByteFrequencyDataCount
        }
    }

    function AudioVisualizer(audioEl, canvasEl, options) {
        // 声明变量
        var audioAnalyser,
            canvasW, canvasH, canvasContext,
            capList, frequencyStep,
            RAFId;

        // 默认设置
        var defaultConf = Object.assign({
            type: 'bars',
            fftIndex: 7
        }, options);

        // 生成分析器
        audioAnalyser = new AudioAnalyser(audioEl, 2, defaultConf.fftIndex);

        canvasW = canvasEl.width;
        canvasH = canvasEl.height > 255 ? canvasEl.height : 255;
        canvasContext = canvasEl.getContext("2d");
        capList = new Uint16Array(audioAnalyser.getByteFrequencyDataCount());
        frequencyStep = canvasW / capList.length;
        canvasContext.lineWidth = frequencyStep * 0.6;

        function convertData(fdl) {
            var result = [];
            for (var i = 0, fdlLength = fdl.length; i < fdlLength; i++) {
                var fd = [].slice.call(fdl[i]);
                if (i % 2 === 0) {
                    for (var j = 0, fdLength = fd.length, range = Math.ceil(fdLength / 2); j < range; j++) {
                        fd[j] = [fd[fdLength - 1 - j], fd[fdLength - 1 - j] = fd[j]][0];
                    }
                }
                result = [].concat(result, fd);
            }
            return result;
        }

        function drawBars(fdl) {
            var fdItem, fdH,
                capH;

            // 清空画布
            canvasContext.clearRect(0, 0, canvasW, canvasH);

            for (var i = 0, fdlLength = fdl.length; i < fdlLength; i++) {
                // 计算
                fdItem = fdl[i];
                fdH = canvasH - fdItem;

                if (isNaN(capList[i])) {
                    capList[i] = 0;
                }
                if (capList[i] < fdItem + 5) {
                    capList[i] = fdItem + 5;
                } else {
                    capList[i] = capList[i] <= 0 ? 0 : capList[i] - 1;
                }
                capH = canvasH - capList[i];

                // 画柱状条
                canvasContext.beginPath();
                var gradient = canvasContext.createLinearGradient(i, canvasH, i, fdH);
                gradient.addColorStop(0, "yellow");
                gradient.addColorStop(1, "red");
                canvasContext.strokeStyle = gradient;
                canvasContext.moveTo(i * frequencyStep, canvasH);
                canvasContext.lineTo(i * frequencyStep, fdH);
                canvasContext.stroke();
                canvasContext.closePath();

                // 画盖帽
                canvasContext.beginPath();
                canvasContext.strokeStyle = 'yellow';
                canvasContext.moveTo(i * frequencyStep, capH);
                canvasContext.lineTo(i * frequencyStep, capH - 5);
                canvasContext.stroke();
                canvasContext.closePath();
            }
        }

        function drawWave(fdl) {
            var fdItem, fdH,
                capH;

            // 清空画布
            canvasContext.clearRect(0, 0, canvasW, canvasH);

            for (var i = 0, fdlLength = fdl.length; i < fdlLength; i++) {
                // 计算
                fdItem = fdl[i];
                fdH = canvasH - fdItem;

                if (isNaN(capList[i])) {
                    capList[i] = 0;
                }
                if (capList[i] < fdItem) {
                    capList[i] = fdItem + 5;
                } else {
                    capList[i] = capList[i] <= 0 ? 0 : capList[i] - 1;
                }
                capH = canvasH - capList[i];

                // 画柱状条
                canvasContext.beginPath();
                var gradient = canvasContext.createLinearGradient(i, canvasH, i, fdH);
                gradient.addColorStop(0, "yellow");
                gradient.addColorStop(1, "red");
                canvasContext.strokeStyle = gradient;
                canvasContext.moveTo(i * frequencyStep, canvasH);
                canvasContext.lineTo(i * frequencyStep, fdH);
                canvasContext.stroke();
                canvasContext.closePath();

                // 画盖帽
                canvasContext.beginPath();
                canvasContext.strokeStyle = 'yellow';
                canvasContext.moveTo(i * frequencyStep, capH);
                canvasContext.lineTo(i * frequencyStep, capH - 5);
                canvasContext.stroke();
                canvasContext.closePath();
            }
        }

        function animateFrame() {
            var fdl = audioAnalyser.getByteFrequencyDataList();
            fdl = convertData(fdl);
            if (defaultConf.type === 'bars') {
                drawBars(fdl);
            }
            RAFId = requestAnimationFrame(animateFrame);
        }

        function start() {
            cancelAnimationFrame(RAFId);
            animateFrame();
        }

        function stop() {
            cancelAnimationFrame(RAFId);
        }

        return {
            start: start,
            stop: stop
        }
    }
    
    return AudioVisualizer;
});