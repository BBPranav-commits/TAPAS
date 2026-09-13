import { ShelterGeometry } from '@/lib/physics/types';

export type ShelterShape =
  | 'box'
  | 'cylinder'
  | 'dome'
  | 'hemisphere'
  | 'a-frame'
  | 'igloo'
  | 'geodesic';

/**
 * Calculate complete shelter geometry including surfaces and orientations.
 * All dimensions in meters. Azimuth in degrees from North (0° = North, 90° = East).
 */
export function calculateGeometry(
  shape: ShelterShape,
  length: number,
  width: number,
  height: number,
  azimuth: number
): ShelterGeometry {
  switch (shape) {
    case 'box':
      return boxGeometry(length, width, height, azimuth);
    case 'cylinder':
      return cylinderGeometry(length, width, height, azimuth);
    case 'dome':
      return tunnelGeometry(length, width, height, azimuth);
    case 'igloo':
      return domeGeometry(length, width, height, azimuth);
    case 'geodesic':
      return geodesicDomeGeometry(length, width, height, azimuth);
    case 'hemisphere':
      return hemisphereGeometry(length, width, height, azimuth);
    case 'a-frame':
      return aFrameGeometry(length, width, height, azimuth);
    default:
      return boxGeometry(length, width, height, azimuth);
  }
}

function boxGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  const floorArea = length * width;
  const volume = floorArea * height;
  const wallArea = 2 * (length + width) * height;
  const roofArea = floorArea; // flat roof

  // 4 walls: front (azimuth), right (azimuth+90), back (azimuth+180), left (azimuth+270)
  // Plus roof (tilt=0) looking up
  const facesWithOrientations = [
    { area: width * height, tilt: 90, azimuth: azimuth % 360 },           // front wall
    { area: length * height, tilt: 90, azimuth: (azimuth + 90) % 360 },   // right wall
    { area: width * height, tilt: 90, azimuth: (azimuth + 180) % 360 },   // back wall
    { area: length * height, tilt: 90, azimuth: (azimuth + 270) % 360 },  // left wall
    { area: roofArea, tilt: 0, azimuth: 0 },                                // roof (horizontal)
  ];

  return { shape: 'box', length, width, height, azimuth, volume, wallArea, roofArea, floorArea, facesWithOrientations };
}

function cylinderGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  // Use average of length and width as diameter
  const radius = (length + width) / 4;
  const floorArea = Math.PI * radius * radius;
  const volume = floorArea * height;
  const circumference = 2 * Math.PI * radius;
  const wallArea = circumference * height;
  const roofArea = floorArea; // flat roof

  // Approximate cylindrical wall as 8 segments
  const nSegments = 8;
  const segmentArea = wallArea / nSegments;
  const facesWithOrientations: { area: number; tilt: number; azimuth: number }[] = [];
  for (let i = 0; i < nSegments; i++) {
    facesWithOrientations.push({
      area: segmentArea,
      tilt: 90,
      azimuth: (azimuth + i * (360 / nSegments)) % 360,
    });
  }
  facesWithOrientations.push({ area: roofArea, tilt: 0, azimuth: 0 });

  return { shape: 'cylinder', length, width, height, azimuth, volume, wallArea, roofArea, floorArea, facesWithOrientations };
}

function tunnelGeometry(
  length: number,
  width: number,
  height: number,
  azimuth: number
): ShelterGeometry {

  /*
    TUNNEL SHAPED SHELTER

    Cross-section:
    Rectangle + semi-elliptical curved roof

          ______
       /          \
      /            \
     |              |
     |              |
  */

  const floorArea = length * width;

  /*
    Cross-sectional area

    Rectangle section:
    width × wallHeight

    Curved roof:
    Half ellipse
  */

  const wallHeight = height * 0.35;
  const roofHeight = height - wallHeight;

  const rectangleArea = width * wallHeight;

  /*
    Area of half ellipse

    π × a × b / 2

    a = width / 2
    b = roofHeight
  */

  const halfEllipseArea =
    (Math.PI * (width / 2) * roofHeight) / 2;

  const crossSectionArea =
    rectangleArea + halfEllipseArea;


  /*
    VOLUME

    Cross-section area × tunnel length
  */

  const volume =
    crossSectionArea * length;


  /*
    FLOOR AREA
  */

  const floor =
    length * width;


  /*
    END WALLS

    Front + Back
  */

  const endWallArea =
    crossSectionArea * 2;


  /*
    STRAIGHT SIDE WALLS

    Two walls
  */

  const sideWallArea =
    2 * length * wallHeight;


  /*
    TOTAL WALL AREA

    Straight side walls
    + front end
    + back end
  */

  const wallArea =
    sideWallArea + endWallArea;


  /*
    CURVED ROOF AREA

    Approximation of half-elliptical
    curved surface.

    Ramanujan ellipse perimeter
  */

  const a = width / 2;
  const b = roofHeight;

  const ellipsePerimeter =
    Math.PI *
    (
      3 * (a + b) -
      Math.sqrt(
        (3 * a + b) *
        (a + 3 * b)
      )
    );


  /*
    Only the upper half of
    the ellipse is the roof
  */

  const roofArcLength =
    ellipsePerimeter / 2;


  /*
    Curved roof area
  */

  const roofArea =
    roofArcLength * length;


  /*
    SURFACE ORIENTATIONS

    Approximate curved roof
    using multiple segments.
  */

  const facesWithOrientations:
    { area: number; tilt: number; azimuth: number }[] = [];


  /*
    FRONT END
  */

  facesWithOrientations.push({
    area: crossSectionArea,
    tilt: 90,
    azimuth: azimuth % 360,
  });


  /*
    BACK END
  */

  facesWithOrientations.push({
    area: crossSectionArea,
    tilt: 90,
    azimuth: (azimuth + 180) % 360,
  });


  /*
    LEFT SIDE WALL
  */

  facesWithOrientations.push({
    area: length * wallHeight,
    tilt: 90,
    azimuth: (azimuth + 270) % 360,
  });


  /*
    RIGHT SIDE WALL
  */

  facesWithOrientations.push({
    area: length * wallHeight,
    tilt: 90,
    azimuth: (azimuth + 90) % 360,
  });


  /*
    CURVED ROOF SEGMENTS

    Divide roof into segments
    for solar / thermal calculations.
  */

  const roofSegments = 8;

  const segmentArea =
    roofArea / roofSegments;


  for (let i = 0; i < roofSegments; i++) {

    /*
      Position across roof:
      0 → left
      1 → right
    */

    const t =
      (i + 0.5) / roofSegments;


    /*
      Roof tilt changes
      from side to top.

      Side ≈ 90°
      Top ≈ 0°
    */

    const tilt =
      Math.abs(
        90 * (2 * t - 1)
      );


    /*
      Azimuth changes from
      one side of tunnel
      to the other.
    */

    const roofAzimuth =
      t < 0.5
        ? (azimuth + 270) % 360
        : (azimuth + 90) % 360;


    facesWithOrientations.push({

      area: segmentArea,

      tilt,

      azimuth: roofAzimuth,

    });

  }


  return {

    shape: 'dome',

    length,

    width,

    height,

    azimuth,

    volume,

    wallArea,

    roofArea,

    floorArea: floor,

    facesWithOrientations,

  };

}

function domeGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  // Ellipsoidal dome: semi-axes a=length/2, b=width/2, c=height
  const a = length / 2;
  const b = width / 2;
  const c = height;
  const floorArea = Math.PI * a * b;
  // Volume of half-ellipsoid
  const volume = (2 / 3) * Math.PI * a * b * c;
  // Surface area approximation (Knud Thomsen)
  const p = 1.6075;
  const surfaceFullEllipsoid = 4 * Math.PI * Math.pow(
    (Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3, 1 / p
  );
  const totalSurfaceArea = surfaceFullEllipsoid / 2; // half ellipsoid
  const wallArea = 0; // dome has no separate walls
  const roofArea = totalSurfaceArea; // entire dome is the "roof"

  // Approximate dome as segments
  const nSegments = 8;
  const segmentArea = totalSurfaceArea / nSegments;
  const facesWithOrientations: { area: number; tilt: number; azimuth: number }[] = [];
  for (let i = 0; i < nSegments; i++) {
    facesWithOrientations.push({
      area: segmentArea,
      tilt: 45, // average tilt for dome segment
      azimuth: (azimuth + i * (360 / nSegments)) % 360,
    });
  }

  return { shape: 'dome', length, width, height, azimuth, volume, wallArea, roofArea, floorArea, facesWithOrientations };
}

function geodesicDomeGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  const base = domeGeometry(length, width, height, azimuth);
  return {
    ...base,
    shape: 'geodesic',
    roofArea: base.roofArea * 1.08,
    volume: base.volume * 1.05,
    facesWithOrientations: base.facesWithOrientations.map((face, idx) => ({
      ...face,
      area: face.area * (idx % 2 === 0 ? 1.1 : 0.9),
      tilt: Math.min(60, face.tilt + 8),
    })),
  };
}

function hemisphereGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  // True hemisphere: radius = min(length, width) / 2, height = radius
  const radius = Math.min(length, width) / 2;
  const floorArea = Math.PI * radius * radius;
  const volume = (2 / 3) * Math.PI * Math.pow(radius, 3);
  const totalSurfaceArea = 2 * Math.PI * radius * radius;
  const wallArea = 0;
  const roofArea = totalSurfaceArea;

  const nSegments = 8;
  const segmentArea = totalSurfaceArea / nSegments;
  const facesWithOrientations: { area: number; tilt: number; azimuth: number }[] = [];
  for (let i = 0; i < nSegments; i++) {
    facesWithOrientations.push({
      area: segmentArea,
      tilt: 45,
      azimuth: (azimuth + i * (360 / nSegments)) % 360,
    });
  }

  return {
    shape: 'hemisphere', length, width,
    height: radius, // override height to radius
    azimuth, volume, wallArea, roofArea, floorArea, facesWithOrientations
  };
}

function aFrameGeometry(length: number, width: number, height: number, azimuth: number): ShelterGeometry {
  // A-frame: triangular cross-section, length is the ridge length
  const floorArea = length * width;
  // Cross-section is a triangle: base=width, height=height
  const crossSectionArea = (width * height) / 2;
  const volume = crossSectionArea * length;
  // Slant height of each roof panel
  const slantHeight = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height, 2));
  const roofPanelArea = slantHeight * length;
  const roofArea = 2 * roofPanelArea; // two sloped panels
  // Gable ends (triangular)
  const gableArea = 2 * crossSectionArea;
  const wallArea = gableArea; // A-frame walls are the gable ends
  
  // Roof tilt angle from horizontal
  const roofTilt = Math.atan2(height, width / 2) * (180 / Math.PI);
  
  const facesWithOrientations = [
    { area: roofPanelArea, tilt: roofTilt, azimuth: (azimuth + 90) % 360 },   // right roof
    { area: roofPanelArea, tilt: roofTilt, azimuth: (azimuth + 270) % 360 },  // left roof
    { area: crossSectionArea, tilt: 90, azimuth: azimuth % 360 },              // front gable
    { area: crossSectionArea, tilt: 90, azimuth: (azimuth + 180) % 360 },      // back gable
  ];

  return { shape: 'a-frame', length, width, height, azimuth, volume, wallArea, roofArea, floorArea, facesWithOrientations };
}

/** Get human-readable shape name */
export function getShapeName(shape: ShelterShape): string {
  const names: Record<ShelterShape, string> = {
    'box': 'Rectangular Box',
    'cylinder': 'Cylinder',
    'dome': 'Tunnel Shelter',
    'hemisphere': 'Hemisphere',
    'a-frame': 'A-Frame',
    'igloo': 'Igloo',
    'geodesic': 'Geodesic Dome',
  };
  return names[shape] || shape;
}

export const SHELTER_SHAPES: ShelterShape[] = ['box', 'cylinder', 'dome', 'hemisphere', 'a-frame', 'igloo', 'geodesic'];
