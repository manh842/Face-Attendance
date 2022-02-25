/** @format */

const video = document.getElementById("video");
const container = document.getElementById("canvas");
const bodyTable = document.getElementById("body-table");
const class_sv = document.getElementById("class");
let html = "";
let stop = document.querySelector("#stop");
let start = document.querySelector("#start");
var faceDescriptors = [];
let attendance = [];
var faceMatcher;
let interval;
let canvas;
async function init() {
  await Promise.all([
    faceapi.loadSsdMobilenetv1Model("/models"),
    faceapi.loadFaceRecognitionModel("/models"),
    faceapi.loadFaceLandmarkModel("/models"),
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  ]);

  Toastify({
    text: "Tải xong model nhận diện!",
  }).showToast();
  document.querySelector(".spinner-wrapper").remove();
}
init();
start.addEventListener("click", async function () {
  let trainingData = await loadTrainingData();
  faceMatcher = new faceapi.FaceMatcher(trainingData, 0.56);
  startVideo();
});
stop.addEventListener("click", async function () {
  stopVideo();
});

function closeCam() {
  let stream = video.srcObject;
  let tracks = stream.getTracks();
  for (let i = 0; i < tracks.length; i++) {
    let track = tracks[i];
    track.stop();
  }
  video.srcObject = null;
}
const logFileText = async (file) => {
  const response = await fetch(file);
  const text = await response.text();
  return text;
};
async function loadTrainingData() {
  faceDescriptors = [];
  let getFileDataTrain = await logFileText("data-train.txt");
  let dataTrainArr = getFileDataTrain
    ? JSON.parse(getFileDataTrain).dataTrain
    : [];
  dataTrainArr.forEach((i) => {
    let label = JSON.parse(i._label);
    if (label.class === class_sv.value) {
      const Arr32 = i._descriptors.map((item) => {
        return new Float32Array(Object.values(item));
      });
      faceDescriptors.push(new faceapi.LabeledFaceDescriptors(i._label, Arr32));
    }
  });
  attendance = [];
  faceDescriptors.forEach((i, index) => {
    let label = JSON.parse(i.label);
    if (label.class === class_sv.value) {
      return attendance.push({
        name: label.name,
        id: label.id,
        class: label.class,
        checked: false,
      });
    }
  });

  renderStudentList();
  return faceDescriptors;
}

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    (stream) => (video.srcObject = stream),
    (err) => console.error(err)
  );
}

function stopVideo() {
  video.pause();
  video.currentTime = 0;
  if (interval) {
    clearInterval(interval);
  }
  if (canvas) {
    container.removeChild(canvas);
  }
  closeCam();
}

video.addEventListener("play", () => {
  canvas = faceapi.createCanvasFromMedia(video);
  document.getElementById("canvas").append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  interval = setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    resizedDetections.forEach((detection) => {
      let bestMatch = "";
      bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      let studentInfo = JSON.parse(
        bestMatch.label !== "unknown" ? bestMatch.label : "{}"
      );
      if (bestMatch !== "unknown") {
        let findIndex = attendance.findIndex((i) => studentInfo.id === i.id);
        if (findIndex > -1) {
          attendance[findIndex].checked = true;
          renderStudentList();
        }
      }

      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: studentInfo.name,
      });
      drawBox.draw(canvas);
    });
  }, 100);
});

const renderStudentList = () => {
  html = "";
  bodyTable.innerHTML = html;
  attendance.forEach((i, index) => {
    html +=
      "<tr><th scope='row'>" +
      i.id +
      "</th><td>" +
      i.name +
      "</td><td>" +
      i.class +
      "</td>  <td><input type='checkbox' value='' class='form-check-input' " +
      (i.checked ? "checked" : "") +
      "/></td></tr>";
  });
  bodyTable.innerHTML = html;
};
