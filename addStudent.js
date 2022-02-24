/** @format */

const video = document.getElementById("video");
const id_sv = document.getElementById("id");
const name_sv = document.getElementById("name");
const class_sv = document.getElementById("class");
let stop_button = document.querySelector("#stop-record");
let start_button = document.querySelector("#start-record");
const container = document.querySelector("#container");
const fileInput = document.querySelector("#file-input");
let image_data = [];
let canvas;
let interval;
let faceMatcher;

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
      if (image_number > 50) {
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

function dataURLtoFile(dataUrl, filename) {
  let arr = dataUrl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

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

async function loadTrainingData() {
  Toastify({
    text: "Chờ xíu!",
  }).showToast();
  const label = JSON.stringify({
    id: id_sv.value,
    name: name_sv.value,
    class: class_sv.value,
  });
  const faceDescriptors = [];
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
  console.log(faceDescriptors);
  Toastify({
    text: `Training xong data của ${label}!`,
  }).showToast();
  let [fileHandle] = await window.showOpenFilePicker(pickerOpts);
  const fileData = await fileHandle.getFile();
  const textData = await fileData.text();
  const data = [
    ...faceDescriptors,
    ...(textData ? JSON.parse(textData).dataTrain : []),
  ];
  console.log(data);
  const dataTrain = {
    dataTrain: data,
    faceMatcher: new faceapi.FaceMatcher(data, 0.6),
  };
  let stream = await fileHandle.createWritable();
  await stream.write(dataTrain);
  await stream.close();
}

fileInput.addEventListener("change", async () => {
  const files = fileInput.files;
  const image = await faceapi.bufferToImage(files[0]);
  const canvas = faceapi.createCanvasFromMedia(image);

  container.innerHTML = "";
  container.append(image);
  container.append(canvas);

  const size = {
    width: image.width,
    height: image.height,
  };

  faceapi.matchDimensions(canvas, size);

  const detections = await faceapi
    .detectAllFaces(image)
    .withFaceLandmarks()
    .withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, size);

  // faceapi.draw.drawDetections(canvas, resizedDetections)

  for (const detection of resizedDetections) {
    const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
      label: faceMatcher.findBestMatch(detection.descriptor).toString(),
    });
    drawBox.draw(canvas);
  }
});
