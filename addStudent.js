/** @format */

const video = document.getElementById("video");
const id_sv = document.getElementById("id");
const name_sv = document.getElementById("name");
const class_sv = document.getElementById("class");
let stop_button = document.querySelector("#stop-record");
let start_button = document.querySelector("#start-record");
let save = document.querySelector("#save");
const pickerOpts = {
  types: [
    {
      description: "TXT",
      accept: {
        "text/plain": [".txt"],
      },
    },
  ],
};
let image_data = [];
let canvas;
let interval;
let faceDescriptors = [];
let dataTrain;

start_button.addEventListener("click", function () {
  image_data = [];
  Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  ]).then(startVideo);
});

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    (stream) => (video.srcObject = stream),
    (err) => console.error(err)
  );
}

stop_button.addEventListener("click", async function () {
  if (!image_data || !image_data.length) {
    Toastify({
      text: "Bật camera để lấy dữ liệu khuôn mặt!",
    }).showToast();
    return;
  }
  if (interval) {
    clearInterval(interval);
  }
  if (canvas) {
    document.body.removeChild(canvas);
  }
  if (video.srcObject) {
    closeCam();
  }
  await loadTrainingData();
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

video.addEventListener("play", () => {
  canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  let image_number = 0;
  interval = setInterval(async () => {
    if (!canvas) {
      return;
    }
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    if (canvas) {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      const canvas_data = document.createElement("canvas");
      canvas_data
        .getContext("2d")
        .drawImage(video, 0, 0, canvas_data.width, canvas_data.height);
      image_number++;
      image_data.push(canvas_data);
      if (image_number > 200) {
        Toastify({
          text: "Tải xong model nhận diện! Bạn có thể  nhận dữ liệu ảnh",
        }).showToast();
        clearInterval(interval);
        document.body.removeChild(canvas);
        interval = undefined;
        canvas = undefined;
      }
    }
  }, 100);
});

const logFileText = async (file) => {
  const response = await fetch(file);
  const text = await response.text();
  return text;
};

async function loadTrainingData() {
  faceDescriptors = [];
  dataTrain = {};
  Toastify({
    text: "Chờ xíu!",
  }).showToast();
  const label = JSON.stringify({
    id: id_sv.value,
    name: name_sv.value,
    class: class_sv.value,
  });
  const descriptors = [];
  for (let i = 0; i < image_data.length; i++) {
    const detection = await faceapi
      .detectSingleFace(image_data[i])
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) {
      descriptors.push(detection.descriptor);
    }
  }
  faceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptors));
  Toastify({
    text: `Training xong data của ${label}!`,
  }).showToast();
  let getFileDataTrain = await logFileText("data-train.txt");
  let dataTrainArr =
    getFileDataTrain !== "" ? JSON.parse(getFileDataTrain).dataTrain : [];
  dataTrain = {
    dataTrain: [...dataTrainArr, ...faceDescriptors],
  };
}

save.addEventListener("click", async function () {
  const newHandle = await window.showSaveFilePicker(pickerOpts);
  let stream = await newHandle.createWritable();
  await stream.write({ type: "write", data: JSON.stringify(dataTrain) });
  await stream.close();
});
