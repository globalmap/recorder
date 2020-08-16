import AudioRecorder from 'https://cdn.jsdelivr.net/npm/audio-recorder-polyfill/index.js';

window.MediaRecorder = AudioRecorder;

if (MediaRecorder.notSupported) {
    document.getElementsByClassName("container").style.display = "none"
}

//circle start
let progressBar = document.querySelector('.e-c-progress');
let indicator = document.getElementById('e-indicator');
let pointer = document.getElementById('e-pointer');
let length = Math.PI * 2 * 100;

progressBar.style.strokeDasharray = length;

let recorder;
let audio; // здесь храниться аудио

function update(value, timePercent) {
    var offset = - length - length * value / (timePercent);
    progressBar.style.strokeDashoffset = offset;
    pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
};

//circle ends
const displayOutput = document.querySelector('.display-remain-time')
const pauseBtn = document.getElementById('pause');

let intervalTimer;
let timeLeft;
let wholeTime = 60; // manage this to set the whole time
let isPaused = false;
let isStarted = false;


update(wholeTime,wholeTime); //refreshes progress bar
displayTimeLeft(wholeTime);

function changeWholeTime(seconds){
    if ((wholeTime + seconds) > 0){
        wholeTime += seconds;
        update(wholeTime,wholeTime);
    }
}

function timer (seconds){ //counts time, takes seconds
    let remainTime = Date.now() + (seconds * 1000);
    displayTimeLeft(seconds);

    intervalTimer = setInterval(function(){
        timeLeft = Math.round((remainTime - Date.now()) / 1000);
        if(timeLeft < 0){
            clearInterval(intervalTimer);
            isStarted = false;
            document.getElementById("siri-container").style.display = "none";
            recorder.stop();
            displayTimeLeft(wholeTime);
            pauseBtn.classList.remove('pause');
            pauseBtn.classList.add('play');
            return ;
        }
        displayTimeLeft(timeLeft);
    }, 1000);
}
function pauseTimer(event){
    if(isStarted === false){
        timer(wholeTime);
        isStarted = true;
        pauseBtn.classList.remove('play');
        pauseBtn.classList.add('pause');

    }else if(isPaused){
        pauseBtn.classList.remove('play');
        pauseBtn.classList.add('pause');
        timer(timeLeft);
        isPaused = isPaused ? false : true;

    }
}

function displayTimeLeft (timeLeft){ //displays time on the input
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    displayOutput.textContent = displayString;
    update(timeLeft, wholeTime);
}

// настройка SiriWave
const siriWave = new SiriWave({
    container: document.getElementById("siri-container"),
    width: 200,
    height: 100,
    color: "#000",
    style: "ios9",
    amplitude: 3,
    speed: 0.3,
    ratio: 1,
    autostart: true
});



let source = undefined;

pauseBtn.addEventListener('click', () => {
    // начало записи
    if(pauseBtn.classList.contains("play")) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            recorder = new MediaRecorder(stream)
            document.getElementById("siri-container").style.display = "block";

            // Set record to <audio> when recording will be finished
            recorder.addEventListener('dataavailable', e => {
                audio = URL.createObjectURL(e.data)

                document.getElementById("audioPlayer")
                    .innerHTML = `<audio src=${audio} controls type="audio/wav">`

            })

            let context =  new (window.AudioContext || window.webkitAudioContext)();
            source = context.createMediaStreamSource(stream);
             let processor
            if (context.createJavaScriptNode) {
                processor = context.createJavaScriptNode(1024, 1, 1);
            } else if (context.createScriptProcessor) {
                processor = context.createScriptProcessor(1024, 1, 1);
            } else {
                throw 'WebAudio not supported!';
            }
            let analyser = context.createAnalyser();
            analyser.fftSize = 4096;
            var dataArray = new Float32Array(analyser.frequencyBinCount);

            source.connect(analyser);
            analyser.connect(processor);
            processor.connect(context.destination);

            analyser.getFloatFrequencyData(dataArray);

            siriWave.start();
            pauseTimer();
            // Start recording
            recorder.start();

            processor.onaudioprocess = function(e) {

                let amplitude = 0;
                let frequency = 0;

                //copy frequency data to myDataArray from analyser.
                analyser.getFloatFrequencyData(dataArray);

                //get max frequency which is greater than -100 dB.
                dataArray.map((item, index)=>{
                    let givenFrequencyDB = item;

                    if(givenFrequencyDB>-100){
                        frequency = Math.max(index,frequency);
                    }
                });

                //multipy frequency by resolution and divide it to scale for setting speed.
                frequency = ((1+frequency)*11.7185)/24000;
                //set the speed for siriwave
                siriWave.setSpeed(frequency);

                //find the max amplituded
                e.inputBuffer.getChannelData(0).map((item)=>{
                    amplitude = Math.max(amplitude, Math.abs(item));
                });

                //output buffer data.
                // console.log(e.outputBuffer.getChannelData(0));

                //scale amplituded from [-1, 1] to [0, 10].
                amplitude = Math.abs(amplitude*10);

                //if amplitude is greater than 0 then set siriwave amplitude else set to 0.0.
                if(amplitude>=0){
                    siriWave.setAmplitude(amplitude);
                }else{
                    siriWave.setAmplitude(0.0);
                }

            };
        })
    } else {
        // конец записи
        recorder.stop()
        siriWave.setAmplitude(0);
        siriWave.setSpeed(0);
        source.disconnect();
        displayTimeLeft(0)
        // Remove “recording” icon from browser tab
        recorder.stream.getTracks().forEach(i => i.stop())

        pauseBtn.classList.remove('pause');
        pauseBtn.classList.add('play');

        clearInterval(intervalTimer);
        isStarted = false;

        document.getElementById("siri-container").style.display = "none";

        displayTimeLeft(wholeTime);
    }
});
