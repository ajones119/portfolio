import nx from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/nx.jpg"
import ny from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/ny.jpg"
import nz from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/nz.jpg"
import pz from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/pz.jpg"
import px from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/px.jpg"
import py from "../../../../assets/images/demoImages/threejs/largeLesson/textures/environmentMap/py.jpg"
import grassColorTexture from "../../../../assets/images/demoImages/threejs/largeLesson/textures/dirt/color.jpg"
import grassNormalTexture from "../../../../assets/images/demoImages/threejs/largeLesson/textures/dirt/normal.jpg"
import foxModel from "../../../../assets/images/demoImages/threejs/largeLesson/models/Fox/glTF/Fox.gltf";
import type { Source } from "../../shared/runtime";


export const sources: Source[] = [
  {
    name: 'environmentMapTexture',
    type: 'cubeTexture',
    path: [
      nx.src,
      ny.src,
      nz.src,
      pz.src,
      px.src,
      py.src,
    ]
  },
  {
    name: 'grassColorTexture',
    type: 'texture',
    path: grassColorTexture.src,
  },
  {
    name: 'grassNormalTexture',
    type: 'texture',
    path: grassNormalTexture.src,
  },
  {
    name: 'foxModel',
    type: 'gltfModel',
    path: foxModel,
  }
]
