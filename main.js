/**
 * @author Kevin Kraus
 */

import * as THREE from "three";
import CameraControls from "camera-controls";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { saveAs } from "file-saver";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { SUBTRACTION, Brush, Evaluator, ADDITION } from "three-bvh-csg";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

CameraControls.install({ THREE: THREE });

var importer;
var enclosureLid;
var inner, line;
var subtractArray = [];
var additionArray = [];
var sceneArray = [];

let selectedObject = null;
var lengthInputValue = 100;
var widthInputValue = 100;
var heightInputValue = 100;
var wallStrength = 4;
var groundStrength = 4;
var coverStrength = 1;

var randomColor;

//basics
var scene, camera, renderer, controls, transformControls;
//UI folder
var folderObjectsInUse;
//enclosure outer shell object
var cube;
//enclosure inner bool object
var cubeBool;
//enclosure cover
var cover;
//screws
var screwRadius = 1.65;
var screwSelection = "M3";
var screw1, screw2, screw3, screw4;

var csgEvaluator;

//Aufrufen der Initialisierungsfunktionen
init();
initUI();

/**
 * initializes most of the scene
 * @function init
 */
function init() {
  importer = new STLLoader();

  //create scene with camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color("black");
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(200, 200, 100);
  camera.near = 0.1;
  camera.far = 3000;
  camera.updateProjectionMatrix();

  //renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000, 1);

  //setup controls to turn inside the scene
  controls = new CameraControls(camera, renderer.domElement);
  controls.mouseButtons.middle = CameraControls.ACTION.NONE;
  controls.mouseButtons.left = CameraControls.ACTION.NONE;
  controls.mouseButtons.right = CameraControls.ACTION.ROTATE;

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //creating axis markers
  const axesHelper = new THREE.AxesHelper(500);
  scene.add(axesHelper);

  //creating a grid on the plane
  const size = 500;
  const divisions = 50;
  const gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);

  //controls to move object
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode("translate");

  transformControls.translationSnap = 1;
  transformControls.rotationSnap = 0.261799; //value in radians; 0.261799 radians = 15°

  /**
   * hiding scaling UI of transformcontrols based on answer of stackoverflow user "Asadbek Eshboev"
   * source: https://stackoverflow.com/questions/68652311/three-js-hide-center-transform-controls/76090534#76090534
   */
  const gizmo = transformControls._gizmo.gizmo;
  ["XYZ", "XY", "YZ", "XZ"].forEach((axis) => {
    const obj = gizmo.translate.getObjectByName(axis);
    obj.visible = false;
    obj.layers.disable(0);
  });
  //************************************************************************************************************* */
  //
  scene.add(transformControls);

  csgEvaluator = new Evaluator();
  csgEvaluator.attributes = ["position", "normal"];

  //creating the cube
  const geometryEnclosure = new THREE.BoxGeometry(100, 100, 100);
  const materialEnclosure = new THREE.MeshBasicMaterial({
    color: "lightblue",
    transparent: true,
  });

  cube = new Brush(geometryEnclosure, materialEnclosure);
  cube.position.y = cube.geometry.parameters.height / 2;
  cube.userData.name = "testcube";
  // cube.material.transparent = true;
  cube.material.opacity = 1;
  cube.visible = true;
  cube.enableGrid = true;

  scene.add(cube);

  //creating a boolean cube
  const geometryBool = new THREE.BoxGeometry(100, 100, 100);
  const materialBool = new THREE.MeshBasicMaterial({ color: "white" });

  cubeBool = new Brush(geometryBool, materialBool);
  cubeBool.operation = SUBTRACTION;
  cubeBool.position.set(0, 0, 0);
  cubeBool.userData.name = "testcubeBool";
  cubeBool.visible = true;
  scene.add(cubeBool);

  //deckel
  const geometryCover = new THREE.BoxGeometry(100, 1, 100);
  const materialCover = new THREE.MeshBasicMaterial({
    color: "orange",
    transparent: true,
  });
  cover = new Brush(geometryCover, materialCover);
  cover.position.y = 100;
  cover.material.opacity = 0.45;
  cover.visible = true;
  scene.add(cover);

  //Default: M3 schrauben; 1.65mm Radius um Ungenauigkeiten beim Testdrucker auszugleichen
  const screwGeometry1 = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  const screwMaterial1 = new THREE.MeshBasicMaterial({ color: "green" });
  screw1 = new Brush(screwGeometry1, screwMaterial1);
  screw1.position.set(96.5 / 2, 100, 96.5 / 2);
  screw1.name = "screw1";
  subtractArray.push(screw1);
  scene.add(screw1);

  const screwGeometry2 = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  const screwMaterial2 = new THREE.MeshBasicMaterial({ color: "green" });
  screw2 = new Brush(screwGeometry2, screwMaterial2);
  screw2.name = "screw2";
  screw2.position.set(-96.5 / 2, 100, 96.5 / 2);
  subtractArray.push(screw2);
  scene.add(screw2);

  const screwGeometry3 = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  const screwMaterial3 = new THREE.MeshBasicMaterial({ color: "green" });
  screw3 = new Brush(screwGeometry3, screwMaterial3);
  screw3.name = "screw3";
  screw3.position.set(96.5 / 2, 100, -96.5 / 2);
  subtractArray.push(screw3);
  scene.add(screw3);

  const screwGeometry4 = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  const screwMaterial4 = new THREE.MeshBasicMaterial({ color: "green" });
  screw4 = new Brush(screwGeometry4, screwMaterial4);
  screw4.name = "screw4";
  screw4.position.set(-96.5 / 2, 100, -96.5 / 2);
  subtractArray.push(screw4);
  scene.add(screw4);
}

/**
 * initializes the default UI elements from lil-gui
 * @function initUI
 */
function initUI() {
  //gui
  const gui = new GUI();

  const reset = {
    Neu: function () {
      window.location.reload();
    },
  };

  gui.add(reset, "Neu");

  const exportEnclosure = {
    Exportieren: function () {
      exportEnclosureToSTL();
      exportLidToSTL();
      exportObjectDataToText();
    },
  };
  gui.add(exportEnclosure, "Exportieren");
  const folderMeasurements = gui.addFolder("Maße in mm");
  const folderControls = gui.addFolder("Steuerungsmodus");
  folderObjectsInUse = gui.addFolder("Geladene Objekte");
  const folderLoadObjects = gui.addFolder("Importiere Objekte");

  const measurements = {
    Länge: 100,
    Breite: 100,
    Höhe: 100,
    Wanddicke: 4,
    Bodendicke: 3,
    Deckeldicke: 1,
    Schrauben: "M3",
    Transparenz: false,
  };

  folderMeasurements.add(measurements, "Länge", 1, 180, 1).onChange((value) => {
    lengthInputValue = value;
  });
  folderMeasurements
    .add(measurements, "Breite", 1, 180, 1)
    .onChange((value) => {
      widthInputValue = value;
    });
  folderMeasurements.add(measurements, "Höhe", 2, 180, 1).onChange((value) => {
    heightInputValue = value;
  });
  folderMeasurements
    .add(measurements, "Wanddicke", 3, 90, 1)
    .onChange((value) => {
      wallStrength = value;
    });
  folderMeasurements
    .add(measurements, "Bodendicke", 1, 180, 1)
    .onChange((value) => {
      groundStrength = value;
    });
  folderMeasurements
    .add(measurements, "Schrauben", ["M2", "M3", "M4"])
    .onChange((value) => {
      screwSelection = value;
      switch (value) {
        case "M2":
          screwRadius = 1.25;
          break;
        case "M3":
          screwRadius = 1.65;
          break;
        case "M4":
          screwRadius = 2.1;
          break;
      }
    });

  folderMeasurements.add(measurements, "Transparenz").onChange((value) => {
    if (value == true) {
      toggleEnclosureTransparency(0.4);
    } else if (value == false) {
      toggleEnclosureTransparency(1);
    }
  });

  const folderCoverSettings = folderMeasurements.addFolder("Deckel");

  const coverSettings = {
    sichtbar: true,
  };

  folderCoverSettings
    .add(measurements, "Deckeldicke", 1, 4, 1)
    .onChange((value) => {
      coverStrength = value;
    });

  folderCoverSettings
    .add(coverSettings, "sichtbar")
    .onChange(toggleCoverVisibility);

  const modeChange = {
    bewegen: function () {
      setModeTranslate();
    },
    drehen: function () {
      setModeRotation();
    },
  };

  folderControls.add(modeChange, "bewegen");
  folderControls.add(modeChange, "drehen");

  const importObjects = {
    "Arduino Uno": function () {
      importArduino();
    },
    ESP32: function () {
      importESP32();
    },
    "LED RGB": function () {
      importLedRgb();
    },
    "LCD I2C 16x2": function () {
      importLCD();
    },
    "Zusätzliche Geometrie (ADDITION)": function () {
      importAdditionalGeometryCube();
    },
  };
  const folderDevices = folderLoadObjects.addFolder("Geräte").close();
  const folderParts = folderLoadObjects.addFolder("Bauteile").close();
  const folderAdvanced = folderLoadObjects.addFolder("Fortgeschritten").close();

  folderDevices.add(importObjects, "Arduino Uno");
  folderDevices.add(importObjects, "ESP32");
  folderParts.add(importObjects, "LED RGB");
  folderParts.add(importObjects, "LCD I2C 16x2");
  folderAdvanced.add(importObjects, "Zusätzliche Geometrie (ADDITION)");
}
/**********************************************************************************/

/**
 * toggles the visibility value (true/false) of the cover object
 * @function toggleCoverVisibility
 */
function toggleCoverVisibility() {
  if (cover.visible == true) {
    cover.visible = false;
  } else {
    cover.visible = true;
  }
}

/**
 * toggles the opacity value of the enclosure
 * @function toggleEnclosureTransparency
 * @param {Number} value
 */
function toggleEnclosureTransparency(value) {
  cube.material.opacity = value;
}

/**
 * calls the evaluate function of csgEvaluator in order to create the enclosure out of the two main cubes
 * @function boolConfirm
 */
function boolConfirm() {
  inner = cube;
  inner = csgEvaluator.evaluate(inner, cubeBool, SUBTRACTION);
  cube.visible = false;
  cubeBool.visible = false;

  var edges = new THREE.EdgesGeometry(inner.geometry);
  line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: "black" })
  );

  scene.add(line);
  scene.add(inner);
}

/**
 * resets the evaluation from boolConfirm, whenever the size of the enclosure is changed
 * @function boolReset
 */
function boolReset() {
  scene.remove(inner);
  scene.remove(line);
  cube.visible = true;
  cubeBool.visible = true;
}

/**
 * handles the changing of the size of the enclosure and anything the gets affected by the size change, like the position of the screws
 * @function setEnclosureSize
 */
function setEnclosureSize() {
  //maximum value for each of them is 180mm, as that is the maximum my 3D-printer can handle for testing
  boolReset();
  cube.scale.set(
    lengthInputValue / 100,
    heightInputValue / 100,
    widthInputValue / 100
  );

  cubeBool.scale.set(
    lengthInputValue / 100 - (wallStrength / 100) * 2,
    heightInputValue / 100,
    widthInputValue / 100 - (wallStrength / 100) * 2
  );

  cover.scale.set(lengthInputValue / 100, coverStrength, widthInputValue / 100);

  //since scaling always affects both sides on the axis, updating the position on scaling the height is necessary, to get the effect of the height only changing
  //in one direction (upwards)
  cube.position.set(0, (heightInputValue - 100) / 2 + 50, 0);
  cubeBool.position.set(
    0,
    (heightInputValue - 100) / 2 + 50 + groundStrength,
    0
  );
  cover.position.y = heightInputValue + coverStrength / 2;

  screw1.position.set(
    96.5 / 2 + (lengthInputValue - 100) / 2 + (3 - wallStrength) / 2,
    95 + coverStrength + (heightInputValue - 100),
    96.5 / 2 + (widthInputValue - 100) / 2 + (3 - wallStrength) / 2
  );
  screw2.position.set(
    -96.5 / 2 - (lengthInputValue - 100) / 2 - (3 - wallStrength) / 2,
    95 + coverStrength + 1 + (heightInputValue - 100),
    96.5 / 2 + (widthInputValue - 100) / 2 + (3 - wallStrength) / 2
  );
  screw3.position.set(
    96.5 / 2 + (lengthInputValue - 100) / 2 + (3 - wallStrength) / 2,
    95 + coverStrength + 1 + (heightInputValue - 100),
    -96.5 / 2 - (widthInputValue - 100) / 2 - (3 - wallStrength) / 2
  );
  screw4.position.set(
    -96.5 / 2 - (lengthInputValue - 100) / 2 - (3 - wallStrength) / 2,
    95 + coverStrength + 1 + (heightInputValue - 100),
    -96.5 / 2 - (widthInputValue - 100) / 2 - (3 - wallStrength) / 2
  );

  screw1.geometry.dispose();
  screw2.geometry.dispose();
  screw3.geometry.dispose();
  screw4.geometry.dispose();

  screw1.geometry = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  screw2.geometry = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  screw3.geometry = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
  screw4.geometry = new THREE.CylinderGeometry(
    screwRadius,
    screwRadius,
    10 + coverStrength + 1,
    32
  );
}

/**
 *  sets the mode of the gizmo of transformControls to "rotation"
 * @function setModeRotation
 */
function setModeRotation() {
  transformControls.setMode("rotate");
}

/**
 * sets the mode of the gizmo of transformControls to "translate" (moving)
 * @function setModeTranslate
 */
function setModeTranslate() {
  transformControls.setMode("translate");
}

/**
 * attaches transformControls to the currently active mesh
 * @function selectObject
 * @param {THREE.Group} mesh
 * ideally a group of mesh that belong together
 */
function selectObject(mesh) {
  selectedObject = mesh;
  transformControls.attach(selectedObject);
}

/**
 * updates the UI for information to the currently active object (position and rotation), as well as showing a warning message where applicable
 * @function updateInfo
 */
function updateInfo() {
  const posXInfo = document.getElementById("posX");
  const posYInfo = document.getElementById("posY");
  const posZInfo = document.getElementById("posZ");

  const rotXInfo = document.getElementById("rotX");
  const rotYInfo = document.getElementById("rotY");
  const rotZInfo = document.getElementById("rotZ");

  const warningInfo = document.getElementById("warning");
  if (selectedObject !== null) {
    var globalPosition = new THREE.Vector3();
    var globalRotation = new THREE.Quaternion();
    var eulerRotation = new THREE.Euler();

    posXInfo.textContent = selectedObject.position.x;
    posYInfo.textContent = selectedObject.position.y;
    posZInfo.textContent = selectedObject.position.z;

    selectedObject.getWorldPosition(globalPosition);
    selectedObject.getWorldQuaternion(globalRotation);

    eulerRotation.setFromQuaternion(globalRotation);

    var eulerX = Math.round(THREE.MathUtils.radToDeg(eulerRotation.x));
    var eulerY = Math.round(THREE.MathUtils.radToDeg(eulerRotation.y));
    var eulerZ = Math.round(THREE.MathUtils.radToDeg(eulerRotation.z));

    rotXInfo.textContent = eulerX;
    rotYInfo.textContent = eulerY;
    rotZInfo.textContent = eulerZ;
  }
  if (
    (wallStrength < 4) & (screwSelection != "M2") ||
    (wallStrength == 4) & (screwSelection == "M4")
  ) {
    warningInfo.innerHTML =
      "<b>Warnung! Die gewählte Schraube (" +
      screwSelection +
      ") ist zu dick für die gewählte Wanddicke (" +
      wallStrength +
      " mm)!</b>";
  } else {
    warningInfo.textContent = "";
  }
}

/**
 * removes the object from the scene, including its mesh, geometry and material. Also removes the mesh's / group's boolean objects
 * from the subtractArray- and additionArray-Arrays using the unique uuids of the boolean objects. That is necessary in order to not have previously placed
 * objects, whose boolean objects were added to one of the two arrays, but then got completely deleted, interfere with the final export of the enclosure.
 * Also removes it from the sceneArray-Array
 * @function removeObjectFromScene
 * @param {Brush} group
 * mesh/brush or ideally a group of meshes
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.MeshBasicMaterial} material
 */
function removeObjectFromScene(group, mainGeometry, mainMaterial) {
  let uuidToRemove = [];
  //find uuid of all the members of the group and save them in an array
  if (group.children != null) {
    group.children.forEach((child) => {
      uuidToRemove.push(child.uuid);
    });
  }
  //filter the subtractArray to remove all objects with the same uuid as in uuidToRemove[]
  subtractArray = subtractArray.filter(
    (mesh) => !uuidToRemove.includes(mesh.uuid)
  );
  //filter the additionArray to remove all objects with the same uuid as in uuidToRemove[]
  additionArray = additionArray.filter(
    (mesh) => !uuidToRemove.includes(mesh.uuid)
  );
  //removes group from sceneArray
  let index = sceneArray.indexOf(group);
  sceneArray.splice(index, 1);
  //remove the group from the scene
  if (group.children != null) {
    group.children.forEach((child) => {
      child.geometry.dispose();
      child.material.dispose();
    });
  }
  scene.remove(group);
  mainGeometry.dispose();
  mainMaterial.dispose();
  transformControls.detach(selectedObject);
}

/**
 * sets the color of the object's material as a hex value
 * @function updateColor
 * @param {THREE.MeshBasicMaterial} material
 * @param {Number} value
 */
function updateColor(material, value) {
  material.color.set(value);
  material.needsUpdate = true;
}

/**
 * evaluates the CSG-operations ADDITION and SUBTRACTION, and exports the enclosure as an STL
 * @function exportEnclosure
 */
function exportEnclosureToSTL() {
  var enclosure = inner;
  for (var brush of additionArray) {
    enclosure = csgEvaluator.evaluate(enclosure, brush, ADDITION);
  }

  for (var brush of subtractArray) {
    enclosure = csgEvaluator.evaluate(enclosure, brush, SUBTRACTION);
  }

  const exporter = new STLExporter();
  const options = { binary: true };
  var resultEnclosure = exporter.parse(enclosure, options);
  var blob = new Blob([resultEnclosure], { type: "text/plain" });
  saveAs(blob, "enclosure.stl");

  enclosure = null;
  resultEnclosure = null;
}

/**
 * evaluates the CSG-operation SUBTRACTION, and exports the cover as an STL
 * @function exportLidToSTL
 */
function exportLidToSTL() {
  enclosureLid = cover;
  for (var brush of subtractArray) {
    enclosureLid = csgEvaluator.evaluate(enclosureLid, brush, SUBTRACTION);
  }

  const exporter2 = new STLExporter();
  const options2 = { binary: true };
  const resultEnclosureLid = exporter2.parse(enclosureLid, options2);
  var blob = new Blob([resultEnclosureLid], { type: "text/plain" });
  saveAs(blob, "enclosureLid.stl");
}

/**
 * notes the position and rotation of all the imported objects in the scene. Also notes the various information of the size of the enclosure
 * @function exportObjectDataToText
 */
function exportObjectDataToText() {
  const positionData = [];
  for (var group of sceneArray) {
    positionData.push({
      name: group.name,
      position_X: group.position.x,
      position_Y: group.position.y,
      position_Z: group.position.z,
      rotation: group.rotation,
    });
  }
  positionData.push({
    length: lengthInputValue,
    width: widthInputValue,
    height: heightInputValue,
    wall: wallStrength,
    cover: coverStrength,
  });
  const positionTxt = JSON.stringify(positionData, null, 2);
  var blob = new Blob([positionTxt], { type: "text/plain" });
  saveAs(blob, "positions.txt");
}

/**
 * toggles the visibility (true/false) of the boolean objects of the imported parts. Also toggles if the boolean objects will be part of the final SUBTRACTION CSG-operations
 * @function toggleBooleanSub
 * @param {Brush} mesh
 * @param {THREE.LineSegments} line
 */
function toggleBooleanSub(mesh, line) {
  if (mesh.visible == true) {
    mesh.visible = false;
    line.visible = false;
    let index = subtractArray.indexOf(mesh);
    subtractArray.splice(index, 1);
  } else {
    mesh.visible = true;
    line.visible = true;
    subtractArray.push(mesh);
  }
  console.log(subtractArray);
}

/**
 * toggles the visibility (true/false) of the boolean objects of the imported parts. Also toggles if the boolean objects will be part of the final ADDITION CSG-operations
 * @function toggleBooleanAdd
 * @param {Brush} mesh
 * @param {THREE.LineSegments} line
 */
function toggleBooleanAdd(mesh, line) {
  if (mesh.visible == true) {
    mesh.visible = false;
    line.visible = false;
    let index = additionArray.indexOf(mesh);
    additionArray.splice(index, 1);
  } else {
    mesh.visible = true;
    line.visible = true;
    additionArray.push(mesh);
  }
  console.log(additionArray);
}

/**
 * function to help import the various boolean objects, to not repeat everything in the import functions
 * @function importHelper
 * @param {string} name name the object should have
 * @param {THREE.BufferGeometry} geometry geometry of the object. STL-file turned Three geometry
 * @param {THREE.EdgesGeometry} edges
 * @param {THREE.MeshBasicMaterial} material material of the object
 * @param {Number} rotationX rotation on the X-Axis in radians
 * @param {Number} rotationY rotation on the Y-Axis in radians
 * @param {Number} rotationZ rotation on teh Z-Axis in radians
 * @returns {Brush} mesh of the object
 * @returns {THREE.LineBasicMaterial} outlines
 */
function importHelper(
  name,
  geometry,
  edges,
  material,
  rotationX,
  rotationY,
  rotationZ
) {
  edges = new THREE.EdgesGeometry(geometry);
  material = new THREE.MeshBasicMaterial({
    color: "green",
    side: THREE.DoubleSide,
    transparent: true,
  });
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: "black" })
  );
  const mesh = new Brush(geometry, material);
  mesh.position.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.rotateX(rotationX);
  mesh.rotateY(rotationY);
  mesh.rotateZ(rotationZ);
  mesh.name = name;

  line.position.set(0, 0, 0);
  line.scale.set(1, 1, 1);
  line.rotateX(rotationX);
  line.rotateY(rotationY);
  line.rotateZ(rotationZ);

  mesh.material.opacity = 0.55;

  return { mesh, line };
}

/**
 * scales the pillars to screw down certain parts according to the position and rotation of the main object to the walls of the enclosure
 * @function scaleOnPositionOrRotationChange
 * @param {string} name
 * @param {Brush} mesh
 * @param {THREE.LineSegments} line
 */
function scaleOnPositionOrRotationChange(name, mesh, line) {
  //scale the holes/tubes to the corresponding wall, no matter the position of the object
  var globalPosition = new THREE.Vector3();
  var globalRotation = new THREE.Quaternion();
  var eulerRotation = new THREE.Euler();

  if (mesh != null) {
    transformControls.addEventListener("change", () => {
      mesh.getWorldPosition(globalPosition);
      mesh.getWorldQuaternion(globalRotation);

      eulerRotation.setFromQuaternion(globalRotation);
      //calculating euler rotation to degrees
      var eulerX = Math.round(THREE.MathUtils.radToDeg(eulerRotation.x));
      var eulerY = Math.round(THREE.MathUtils.radToDeg(eulerRotation.y));
      var eulerZ = Math.round(THREE.MathUtils.radToDeg(eulerRotation.z));

      if (eulerX == -90 && eulerY == 0 && eulerZ == 0) {
        let currentPosition = globalPosition.y;
        if (currentPosition > 0) {
          let scaleFactor = currentPosition;
          mesh.scale.set(1, 1, scaleFactor);
          line.scale.set(1, 1, scaleFactor);
        }
      } else if (eulerX == 0) {
        /**BREITE*****************************************************************/
        let currentPosition = globalPosition.z;
        let scaleFactor = currentPosition + widthInputValue / 2;
        if (scaleFactor <= 0) {
          scaleFactor = 1;
        }
        mesh.scale.set(1, 1, scaleFactor);
        line.scale.set(1, 1, scaleFactor);
      } else if (eulerX == -180) {
        let currentPosition = globalPosition.z;
        let scaleFactor = Math.abs(currentPosition - widthInputValue / 2);
        if (scaleFactor <= 0 || currentPosition > widthInputValue / 2) {
          scaleFactor = 1;
        }
        mesh.scale.set(1, 1, scaleFactor);
        line.scale.set(1, 1, scaleFactor);
      } else if (eulerY == 90) {
        /*************************************************************************/
        /**LÄNGE******************************************************************/
        let currentPosition = globalPosition.x;
        let scaleFactor = currentPosition + lengthInputValue / 2;
        if (scaleFactor <= 0) {
          scaleFactor = 1;
        }
        mesh.scale.set(1, 1, scaleFactor);
        line.scale.set(1, 1, scaleFactor);
      } else if (eulerY == -90) {
        let currentPosition = globalPosition.x;
        let scaleFactor = Math.abs(currentPosition - lengthInputValue / 2);
        if (scaleFactor <= 0 || currentPosition > lengthInputValue / 2) {
          scaleFactor = 1;
        }
        mesh.scale.set(1, 1, scaleFactor);
        line.scale.set(1, 1, scaleFactor);
      } else {
        mesh.scale.set(1, 1, 1);
        line.scale.set(1, 1, 1);
      }
    });
  }
}

/**
 * imports the arduino object from the STL-file, as well as all the boolean objects.
 * @function importArduino
 */
async function importArduino() {
  const ArduinoFolder = folderObjectsInUse.addFolder("Arduino Uno");
  const arduinoGroup1 = new THREE.Group();
  arduinoGroup1.name = "Arduino";
  //Load arduino model for visual representation
  try {
    //Arduino
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/Arduino_Uno/arduino.stl", function (geometry) {
        randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        const arduino = geometry;
        var edges = new THREE.EdgesGeometry(arduino);
        var material = new THREE.MeshBasicMaterial({
          color: randomColor,
          side: THREE.DoubleSide,
        });
        var arduinoLine = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: "black" })
        );
        const arduinoMesh = new Brush(arduino, material);
        arduinoMesh.position.set(0, 0, 0);
        arduinoMesh.scale.set(1, 1, 1);
        arduinoMesh.rotateX(-1.5707963268); //radians; 90 degrees
        arduinoLine.position.set(0, 0, 0);
        arduinoLine.scale.set(1, 1, 1);
        arduinoLine.rotateX(-1.5707963268);

        arduinoGroup1.add(arduinoMesh);
        arduinoGroup1.add(arduinoLine);

        console.log("loaded arduino");

        const ArduinoFolderObject = {
          Auswählen: function () {
            selectObject(arduinoGroup1);
          },
          Löschen: function () {
            ArduinoFolder.destroy();
            removeObjectFromScene(arduinoGroup1, arduino, material);
          },
          Farbe: randomColor,
        };
        ArduinoFolder.add(ArduinoFolderObject, "Auswählen");
        ArduinoFolder.add(ArduinoFolderObject, "Löschen");
        ArduinoFolder.addColor(ArduinoFolderObject, "Farbe").onChange(
          (value) => {
            updateColor(material, value);
          }
        );
        resolve();
      });
    });
    const ArduinoBooleanFolder =
      ArduinoFolder.addFolder("Boolean Objekte").close();
    //ICSP1
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoICSP1.stl",
        function (geometry) {
          var edges, material;
          const { mesh, line } = importHelper(
            "ICSP1",
            geometry,
            edges,
            material,
            -1.5707963268,
            0,
            0
          );

          const ArduinoICSP1 = {
            ICSP1: true,
          };
          ArduinoBooleanFolder.add(ArduinoICSP1, "ICSP1").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });
          arduinoGroup1.add(mesh);
          arduinoGroup1.add(line);
          subtractArray.push(mesh);
          resolve();
        }
      );
    });
    //ICSP2
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoICSP2.stl",
        function (geometry) {
          var edges, material;
          const { mesh, line } = importHelper(
            "ICSP2",
            geometry,
            edges,
            material,
            -1.5707963268,
            0,
            0
          );

          const ArduinoICSP2 = {
            ICSP2: true,
          };
          ArduinoBooleanFolder.add(ArduinoICSP2, "ICSP2").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });
          arduinoGroup1.add(mesh);
          arduinoGroup1.add(line);
          subtractArray.push(mesh);
          resolve();
        }
      );
    });
    //Analog Pins
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoPinsAnalog.stl",
        function (geometry) {
          var edges, material;
          const { mesh, line } = importHelper(
            "Analog Pin",
            geometry,
            edges,
            material,
            -1.5707963268,
            0,
            0
          );

          const ArduinoPinsA = {
            "Analog Pins": true,
          };
          ArduinoBooleanFolder.add(ArduinoPinsA, "Analog Pins").onChange(
            (value) => {
              toggleBooleanSub(mesh, line);
            }
          );
          arduinoGroup1.add(mesh);
          arduinoGroup1.add(line);
          subtractArray.push(mesh);
          resolve();
        }
      );
    });
    //Digital Pins
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoPinsDigital.stl",
        function (geometry) {
          var edges, material;
          const { mesh, line } = importHelper(
            "Digital Pin",
            geometry,
            edges,
            material,
            -1.5707963268,
            0,
            0
          );

          const ArduinoPinsD = {
            "Digital Pins": true,
          };
          ArduinoBooleanFolder.add(ArduinoPinsD, "Digital Pins").onChange(
            (value) => {
              toggleBooleanSub(mesh, line);
            }
          );

          arduinoGroup1.add(mesh);
          arduinoGroup1.add(line);
          subtractArray.push(mesh);
          resolve();
        }
      );
    });
    //Power
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoStromversorgung.stl",
        function (geometry) {
          var edges, material;
          const { mesh, line } = importHelper(
            "Strom",
            geometry,
            edges,
            material,
            -1.5707963268,
            0,
            0
          );
          const ArduinoStrom = {
            Stromversorgung: true,
          };
          ArduinoBooleanFolder.add(ArduinoStrom, "Stromversorgung").onChange(
            (value) => {
              toggleBooleanSub(mesh, line);
            }
          );

          arduinoGroup1.add(mesh);
          arduinoGroup1.add(line);
          subtractArray.push(mesh);
          resolve();
        }
      );
    });
    //USB
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/Arduino_Uno/arduinoUSB.stl", function (geometry) {
        var edges, material;
        const { mesh, line } = importHelper(
          "USB",
          geometry,
          edges,
          material,
          -1.5707963268,
          0,
          0
        );

        const ArduinoUSB = {
          USB: true,
        };
        ArduinoBooleanFolder.add(ArduinoUSB, "USB").onChange((value) => {
          toggleBooleanSub(mesh, line);
        });

        arduinoGroup1.add(mesh);
        arduinoGroup1.add(line);
        subtractArray.push(mesh);

        resolve();
      });
    });

    /*************************************************************************************/

    //load hole geometry
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/Arduino_Uno/arduinoLoch.stl",
        function (geometry) {
          var edges = new THREE.EdgesGeometry(geometry);
          var material = new THREE.MeshBasicMaterial({
            color: "blue",
            side: THREE.DoubleSide,
            transparent: true,
          });
          var arduinoLochLine = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: "black" })
          );
          var arduinoLochMesh = new Brush(geometry, material);
          arduinoLochMesh.position.set(0, 0, 0);
          arduinoLochMesh.scale.set(1, 1, 1);
          arduinoLochMesh.rotateX(-1.5707963268);

          arduinoLochLine.position.set(0, 0, 0);
          arduinoLochLine.scale.set(1, 1, 1);
          arduinoLochLine.rotateX(-1.5707963268);

          arduinoLochMesh.material.opacity = 0.55;

          arduinoGroup1.add(arduinoLochMesh);
          arduinoGroup1.add(arduinoLochLine);
          additionArray.push(arduinoLochMesh);

          scaleOnPositionOrRotationChange(
            "arduino",
            arduinoLochMesh,
            arduinoLochLine
          );

          const Arduino_Befestigung = {
            Schraubbefestigung: true,
          };
          ArduinoBooleanFolder.add(
            Arduino_Befestigung,
            "Schraubbefestigung"
          ).onChange((value) => {
            toggleBooleanAdd(arduinoLochMesh, arduinoLochLine);
          });
          resolve();
        }
      );
    });
    scene.add(arduinoGroup1);
    sceneArray.push(arduinoGroup1);
    console.log(subtractArray);
  } catch (error) {
    console.log("error: ", error);
  }
}

/**
 * imports the ESP32 object from the STL-file, as well as all the boolean objects
 * @function importESP32
 */
async function importESP32() {
  const ESPGroup1 = new THREE.Group();
  const ESPFolder1 = folderObjectsInUse.addFolder("ESP32");
  ESPGroup1.name = "ESP32";
  //Load esp model for visual representation
  try {
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/ESP32_No_Hole/esp32.stl", function (geometry) {
        randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        var edges = new THREE.EdgesGeometry(geometry);
        var material = new THREE.MeshBasicMaterial({
          color: randomColor,
          side: THREE.DoubleSide,
        });
        var ESPLine = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: "black" })
        );
        var ESPMesh = new Brush(geometry, material);
        ESPMesh.position.set(0, 0, 0);
        ESPMesh.scale.set(1, 1, 1);
        ESPMesh.rotateY(1.5707963268);
        ESPLine.position.set(0, 0, 0);
        ESPLine.scale.set(1, 1, 1);
        ESPLine.rotateY(1.5707963268);

        ESPGroup1.add(ESPMesh);
        ESPGroup1.add(ESPLine);

        //const ESPFolder1 = folderObjectsInUse.addFolder("ESP32");
        const ESPFolderObject = {
          Auswählen: function () {
            selectObject(ESPGroup1);
          },
          Löschen: function () {
            ESPFolder1.destroy();
            removeObjectFromScene(ESPGroup1, geometry, material);
          },
          Farbe: randomColor,
        };
        ESPFolder1.add(ESPFolderObject, "Auswählen");
        ESPFolder1.add(ESPFolderObject, "Löschen");
        ESPFolder1.addColor(ESPFolderObject, "Farbe").onChange((value) => {
          updateColor(material, value);
        });
        resolve();
      });
    });
    const ESPBooleanFolder = ESPFolder1.addFolder("Boolean Objekte").close();
    //load actual boolean geometry
    //USB
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/ESP32_No_Hole/esp32Anschluss.stl",
        function (geometry) {
          var edges, material;

          const { mesh, line } = importHelper(
            "USB",
            geometry,
            edges,
            material,
            0,
            1.5707963268,
            0
          );

          const USB = {
            USB: true,
          };
          ESPBooleanFolder.add(USB, "USB").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });

          ESPGroup1.add(mesh);
          ESPGroup1.add(line);
          subtractArray.push(mesh);

          resolve();
        }
      );
    });

    //Pins
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/ESP32_No_Hole/esp32Pins.stl",
        function (geometry) {
          var edges, material;

          const { mesh, line } = importHelper(
            "Pins",
            geometry,
            edges,
            material,
            0,
            1.5707963268,
            0
          );

          const ESP_Pins = {
            Pins: true,
          };
          ESPBooleanFolder.add(ESP_Pins, "Pins").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });

          ESPGroup1.add(mesh);
          ESPGroup1.add(line);
          subtractArray.push(mesh);

          resolve();
        }
      );
    });

    //load hole geometry
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/ESP32_No_Hole/esp32Loch.stl",
        function (geometry) {
          var edges = new THREE.EdgesGeometry(geometry);
          var material = new THREE.MeshBasicMaterial({
            color: "blue",
            side: THREE.DoubleSide,
            transparent: true,
          });
          var line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: "black" })
          );
          var mesh = new Brush(geometry, material);
          mesh.position.set(0, 0, 0);
          mesh.scale.set(1, 1, 1);
          mesh.rotateY(1.5707963268);

          line.position.set(0, 0, 0);
          line.scale.set(1, 1, 1);
          line.rotateY(1.5707963268);

          mesh.material.opacity = 0.55;

          scaleOnPositionOrRotationChange("ESP", mesh, line);

          ESPGroup1.add(mesh);
          ESPGroup1.add(line);
          ESPGroup1.rotateY(-1.5707963268);
          ESPGroup1.rotateZ(1.5707963268);

          const ESP_Befestigung = {
            Schraubbefestigung: true,
          };
          ESPBooleanFolder.add(ESP_Befestigung, "Schraubbefestigung").onChange(
            (value) => {
              toggleBooleanAdd(mesh, line);
            }
          );
          additionArray.push(mesh);
          resolve();
        }
      );
    });
    scene.add(ESPGroup1);
    sceneArray.push(ESPGroup1);
  } catch {
    console.log("error: ", error);
  }
}

/**
 * imports the LED object from the STL-file, as well as all the boolean objects
 * @function importLedRgb
 */
async function importLedRgb() {
  const ledrgbGroup = new THREE.Group();
  ledrgbGroup.name = "LED RGB";
  try {
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/LED_rgb/led_rgb.stl", function (geometry) {
        randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        var edges = new THREE.EdgesGeometry(geometry);
        var material = new THREE.MeshBasicMaterial({
          color: randomColor,
          side: THREE.DoubleSide,
        });
        var line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: "black" })
        );
        var mesh = new Brush(geometry, material);
        mesh.position.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.rotateY(1.5707963268);
        line.position.set(0, 0, 0);
        line.scale.set(1, 1, 1);
        line.rotateY(1.5707963268);

        ledrgbGroup.add(mesh);
        ledrgbGroup.add(line);

        const LEDFolder = folderObjectsInUse.addFolder("LED RGB");
        const LEDFolderObject = {
          Auswählen: function () {
            selectObject(ledrgbGroup);
          },
          Löschen: function () {
            LEDFolder.destroy();
            removeObjectFromScene(ledrgbGroup, geometry, material);
          },
          Farbe: randomColor,
        };
        LEDFolder.add(LEDFolderObject, "Auswählen");
        LEDFolder.add(LEDFolderObject, "Löschen");
        LEDFolder.addColor(LEDFolderObject, "Farbe").onChange((value) => {
          updateColor(material, value);
        });
        resolve();
      });
    });
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/LED_rgb/led_rgb_bool.stl", function (geometry) {
        var edges, material;

        const { mesh, line } = importHelper(
          "LED",
          geometry,
          edges,
          material,
          0,
          1.5707963268 * 2,
          0
        );
        ledrgbGroup.add(mesh);
        ledrgbGroup.add(line);
        ledrgbGroup.rotateY(-1.5707963268);
        ledrgbGroup.rotateZ(1.5707963268);
        scene.add(ledrgbGroup);
        sceneArray.push(ledrgbGroup);
        subtractArray.push(mesh);
        resolve();
      });
    });
    console.log(ledrgbGroup.children);
  } catch {
    console.log("error: ", error);
  }
}

/**
 * imports the LCD object from the STL-file, as well as all the boolean objects
 * @function importLCD
 */
async function importLCD() {
  const LCDGroup = new THREE.Group();
  LCDGroup.name = "LCD I2C 16x2";

  const LCDFolder = folderObjectsInUse.addFolder("LCD I2C 16x2");
  LCDFolder.name = "LCD I2C 16x2";
  try {
    //LCD
    await new Promise((resolve, reject) => {
      importer.load("stlfiles/LCD_I2C_16x2/lcd.stl", function (geometry) {
        randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        var edges = new THREE.EdgesGeometry(geometry);
        var material = new THREE.MeshBasicMaterial({
          color: randomColor,
          side: THREE.DoubleSide,
        });
        var line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: "black" })
        );
        var mesh = new Brush(geometry, material);
        mesh.position.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.rotateY(1.5707963268);
        line.position.set(0, 0, 0);
        line.scale.set(1, 1, 1);
        line.rotateY(1.5707963268);

        LCDGroup.add(mesh);
        LCDGroup.add(line);

        const LCDFolderObject = {
          Auswählen: function () {
            selectObject(LCDGroup);
          },
          Löschen: function () {
            LCDFolder.destroy();
            removeObjectFromScene(LCDGroup, geometry, material);
          },
          Farbe: randomColor,
        };
        LCDFolder.add(LCDFolderObject, "Auswählen");
        LCDFolder.add(LCDFolderObject, "Löschen");
        LCDFolder.addColor(LCDFolderObject, "Farbe").onChange((value) => {
          updateColor(material, value);
        });
        resolve();
      });
    });
    const LCDBooleanFolder = LCDFolder.addFolder("Boolean Objekte").close();
    //Anschluss
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/LCD_I2C_16x2/lcd_bool_anschluss.stl",
        function (geometry) {
          var edges, material;

          const { mesh, line } = importHelper(
            "USB",
            geometry,
            edges,
            material,
            0,
            1.5707963268,
            0
          );

          const Anschluss = {
            Anschluss: true,
          };
          LCDBooleanFolder.add(Anschluss, "Anschluss").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });

          LCDGroup.add(mesh);
          LCDGroup.add(line);
          subtractArray.push(mesh);

          resolve();
        }
      );
    });
    //body
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/LCD_I2C_16x2/lcd_bool_body.stl",
        function (geometry) {
          var edges, material;

          const { mesh, line } = importHelper(
            "Body",
            geometry,
            edges,
            material,
            0,
            1.5707963268,
            0
          );

          const Bildschirm = {
            Bildschirm: true,
          };
          LCDBooleanFolder.add(Bildschirm, "Bildschirm").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });

          LCDGroup.add(mesh);
          LCDGroup.add(line);
          subtractArray.push(mesh);

          resolve();
        }
      );
    });
    //hole
    await new Promise((resolve, reject) => {
      importer.load(
        "stlfiles/LCD_I2C_16x2/lcd_bool_loch.stl",
        function (geometry) {
          var edges, material;

          const { mesh, line } = importHelper(
            "Holes",
            geometry,
            edges,
            material,
            0,
            1.5707963268,
            0
          );

          const Löcher = {
            Löcher: true,
          };
          LCDBooleanFolder.add(Löcher, "Löcher").onChange((value) => {
            toggleBooleanSub(mesh, line);
          });

          LCDGroup.add(mesh);
          LCDGroup.add(line);
          subtractArray.push(mesh);

          resolve();
        }
      );
    });

    scene.add(LCDGroup);
    sceneArray.push(LCDGroup);
  } catch {
    console.log("error: ", error);
  }
}

/**
 * additional cube geometry to be added to the enclosure
 * @function importAdditionalGeometry
 */
function importAdditionalGeometryCube() {
  const cubeFolder = folderObjectsInUse.addFolder(
    "Zusätzliche Geometrie (Würfel)"
  );
  let additionalGeometryLength,
    additionalGeometryWidth,
    additionalGeometryHeight;
  var geometry, material;
  geometry = new THREE.BoxGeometry(1, 1, 1);
  material = new THREE.MeshBasicMaterial({
    color: "blue",
    transparent: true,
  });
  var mesh = new Brush(geometry, material);
  mesh.material.opacity = 0.55;
  mesh.position.set(0, 0, 0);

  const cubeFolderObject = {
    Auswählen: function () {
      selectObject(mesh);
    },
    Löschen: function () {
      cubeFolder.destroy();
      removeObjectFromScene(mesh, geometry, material);
    },
  };
  cubeFolder.add(cubeFolderObject, "Auswählen");
  cubeFolder.add(cubeFolderObject, "Löschen");

  const cubeBooleanFolder = cubeFolder.addFolder("Maße");

  const additionalGeometryMeasurements = {
    Länge: 1,
    Breite: 1,
    Höhe: 1,
  };
  cubeBooleanFolder
    .add(additionalGeometryMeasurements, "Länge", 1, 180, 1)
    .onChange((value) => {
      additionalGeometryLength = value;
      mesh.scale.set(
        additionalGeometryLength / 1,
        additionalGeometryHeight / 1,
        additionalGeometryWidth / 1
      );
    });
  cubeBooleanFolder
    .add(additionalGeometryMeasurements, "Breite", 1, 180, 1)
    .onChange((value) => {
      additionalGeometryWidth = value;
      mesh.scale.set(
        additionalGeometryLength / 1,
        additionalGeometryHeight / 1,
        additionalGeometryWidth / 1
      );
    });
  cubeBooleanFolder
    .add(additionalGeometryMeasurements, "Höhe", 2, 180, 1)
    .onChange((value) => {
      additionalGeometryHeight = value;
      mesh.scale.set(
        additionalGeometryLength / 1,
        additionalGeometryHeight / 1,
        additionalGeometryWidth / 1
      );
    });

  additionArray.push(mesh);
  scene.add(mesh);
}

//animate function to update the scene
/**
 * animate function to show changes in real time
 * @function animate
 */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateInfo();
  setEnclosureSize();
  boolConfirm();
  camera.updateProjectionMatrix();
  render();
}

/**
 * renders scene and camera
 * @function render
 */
function render() {
  renderer.render(scene, camera);
}

animate();
