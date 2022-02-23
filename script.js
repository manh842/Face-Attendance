/** @format */

const video = document.getElementById("video");
const container = document.querySelector("#container");
const bodyTable = document.getElementById("body-table");
const faceDescriptors = [];
const attendance = [];
async function loadTrainingData() {
  const labels = [
    "Fukada Eimi",
    "Rina Ishihara",
    "Takizawa Laura",
    "Yua Mikami",
  ];

  for (const label of labels) {
    const descriptors = [];
    for (let i = 1; i <= 4; i++) {
      const image = await faceapi.fetchImage(`/data/${label}/${i}.jpeg`);
      const detection = await faceapi
        .detectSingleFace(image)
        .withFaceLandmarks()
        .withFaceDescriptor();
      descriptors.push(detection.descriptor);
    }
    faceDescriptors.push(
      new faceapi.LabeledFaceDescriptors(label, descriptors)
    );
    Toastify({
      text: `Training xong data của ${label}!`,
    }).showToast();
  }
  renderStudentList();
  return faceDescriptors;
}

var faceMatcher;
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

  const trainingData = await loadTrainingData();
  faceMatcher = new faceapi.FaceMatcher(trainingData, 0.6);

  console.log(faceMatcher);
  // document.querySelector("#loading").remove();
  startVideo();
}

init();

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    (stream) => (video.srcObject = stream),
    (err) => console.error(err)
  );
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.getElementById("canvas").append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    resizedDetections.forEach((detection) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor).toString(),
      const findIndex = attendance.find(i => i === bestMatch)
      if(findIndex >= -1)  {
        
      }
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: bestMatch,
      });
      drawBox.draw(canvas);
    });
  }, 100);
});

const renderStudentList = () => {
  attendance = faceDescriptors.map((i) => {
    return i.label;
  });
  console.log(attendance);
  let html = "";
  attendance.forEach((i, index) => {
    html += "<tr><th scope='row'>" + index + "</th><td>" + i + "</td></tr>";
  });
  console.log(html);
  bodyTable.innerHTML = html;
};
