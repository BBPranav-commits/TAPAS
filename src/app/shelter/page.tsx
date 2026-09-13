'use client';

import { useApp } from '@/context/AppContext';
import { ShelterShape, SHELTER_SHAPES, getShapeName, calculateGeometry } from '@/lib/geometry/calculator';

const SHAPE_ICONS: Record<ShelterShape, string> = {
  box: '▭',
  cylinder: '◯',
  dome: '⌒',
  hemisphere: '∩',
  'a-frame': '△',
  igloo: '◍',
  geodesic: '⬡',
};

type PreviewView = 'front' | 'side' | 'top';
function Shelter3DPreview({
  shape,
  length,
  width,
  height,
  azimuth,
}: {
  shape: ShelterShape;
  length: number;
  width: number;
  height: number;
  azimuth: number;
}) {
  const svgW = 500;
  const svgH = 300;

  const cx = svgW / 2;
  const cy = svgH / 2 + 35;

  /*
    Scale the shelter so that all
    dimensions fit inside the SVG.
  */

  const maxDimension = Math.max(
    length,
    width,
    height,
    1
  );

  const scale = 180 / maxDimension;

  /*
    Azimuth rotation.

    0°   = North
    90°  = East
    180° = South
    270° = West
  */

  const angle =
    (azimuth * Math.PI) / 180;

  /*
    Fixed isometric camera angle.
  */

  const cameraAngle =
    (-35 * Math.PI) / 180;

  type Point3D = {
    x: number;
    y: number;
    z: number;
  };

  type Point2D = {
    x: number;
    y: number;
  };

  /*
    Rotate the shelter around
    the vertical Z-axis.
  */

  function rotatePoint(
    point: Point3D
  ): Point3D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
      x:
        point.x * cos -
        point.y * sin,

      y:
        point.x * sin +
        point.y * cos,

      z: point.z,
    };
  }

  /*
    Convert a 3D point into
    a 2D isometric SVG position.
  */

  function projectPoint(
    point: Point3D
  ): Point2D {
    const rotated =
      rotatePoint(point);

    const cosCamera =
      Math.cos(cameraAngle);

    const sinCamera =
      Math.sin(cameraAngle);

    const screenX =
      cx +
      scale *
        (
          rotated.x * cosCamera -
          rotated.y * sinCamera
        );

    const screenY =
      cy +
      scale *
        (
          -rotated.z +
          (
            rotated.x * sinCamera +
            rotated.y * cosCamera
          ) *
            0.45
        );

    return {
      x: screenX,
      y: screenY,
    };
  }

  /*
    Create an SVG line
    between two 3D points.
  */

  function line(
    a: Point3D,
    b: Point3D,
    key: string,
    stroke = "#60a5fa",
    strokeWidth = 1.5,
    opacity = 1
  ) {
    const p1 = projectPoint(a);
    const p2 = projectPoint(b);

    return (
      <line
        key={key}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  }

  /*
    Draw a connected 3D path.
  */

  function polyline(
    points: Point3D[],
    key: string,
    stroke = "#3b82f6",
    strokeWidth = 1.5,
    opacity = 1,
    closed = false
  ) {
    const projected =
      points.map((point) => {
        const p = projectPoint(point);

        return `${p.x},${p.y}`;
      });

    if (closed && projected.length > 0) {
      projected.push(projected[0]);
    }

    return (
      <polyline
        key={key}
        points={projected.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  }

  /*
    =================================================
    BOX
    =================================================
  */

  function renderBox() {
    const L = length / 2;
    const W = width / 2;
    const H = height;

    const points: Point3D[] = [
      { x: -L, y: -W, z: 0 },
      { x: L, y: -W, z: 0 },
      { x: L, y: W, z: 0 },
      { x: -L, y: W, z: 0 },

      { x: -L, y: -W, z: H },
      { x: L, y: -W, z: H },
      { x: L, y: W, z: H },
      { x: -L, y: W, z: H },
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],

      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],

      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    return edges.map(
      ([a, b], index) =>
        line(
          points[a],
          points[b],
          `box-${index}`
        )
    );
  }

  /*
    =================================================
    CYLINDER
    =================================================
  */

  function renderCylinder() {
    const elements: JSX.Element[] = [];

    const radius =
      Math.min(length, width) / 2;

    const segments = 24;

    /*
      Bottom circle
    */

    const bottom: Point3D[] = [];

    /*
      Top circle
    */

    const top: Point3D[] = [];

    for (
      let i = 0;
      i < segments;
      i++
    ) {
      const a =
        (Math.PI * 2 * i) /
        segments;

      bottom.push({
        x: radius * Math.cos(a),
        y: radius * Math.sin(a),
        z: 0,
      });

      top.push({
        x: radius * Math.cos(a),
        y: radius * Math.sin(a),
        z: height,
      });
    }

    elements.push(
      polyline(
        bottom,
        "cylinder-bottom",
        "#3b82f6",
        1.5,
        0.8,
        true
      )
    );

    elements.push(
      polyline(
        top,
        "cylinder-top",
        "#3b82f6",
        1.5,
        1,
        true
      )
    );

    /*
      Vertical structural lines
    */

    for (
      let i = 0;
      i < segments;
      i += 4
    ) {
      elements.push(
        line(
          bottom[i],
          top[i],
          `cylinder-side-${i}`,
          "#60a5fa",
          1.2,
          0.7
        )
      );
    }

    return elements;
  }

  /*
    =================================================
    TUNNEL SHELTER
    =================================================

    In your current project,
    "dome" represents the
    tunnel-shaped shelter.
  */

  function renderTunnel() {
    const elements: JSX.Element[] = [];

    const L = length / 2;
    const W = width / 2;

    const wallHeight =
      height * 0.35;

    const roofHeight =
      height - wallHeight;

    const archSegments = 18;

    /*
      Create tunnel arch
      at a particular X position.
    */

    function createArch(
      x: number
    ): Point3D[] {
      const points: Point3D[] = [];

      /*
        Left wall bottom
      */

      points.push({
        x,
        y: -W,
        z: 0,
      });

      /*
        Left wall top
      */

      points.push({
        x,
        y: -W,
        z: wallHeight,
      });

      /*
        Curved roof
      */

      for (
        let i = 0;
        i <= archSegments;
        i++
      ) {
        const t =
          Math.PI -
          (Math.PI * i) /
            archSegments;

        points.push({
          x,

          y:
            W * Math.cos(t),

          z:
            wallHeight +
            roofHeight *
              Math.sin(t),
        });
      }

      /*
        Right wall bottom
      */

      points.push({
        x,
        y: W,
        z: 0,
      });

      return points;
    }

    /*
      Main front and back arches.
    */

    const frontArch =
      createArch(-L);

    const backArch =
      createArch(L);

    elements.push(
      polyline(
        frontArch,
        "tunnel-front",
        "#3b82f6",
        2,
        1
      )
    );

    elements.push(
      polyline(
        backArch,
        "tunnel-back",
        "#3b82f6",
        2,
        0.8
      )
    );

    /*
      Longitudinal structural ribs.
    */

    const ribs = 6;

    for (
      let i = 0;
      i <= ribs;
      i++
    ) {
      const x =
        -L +
        (length * i) / ribs;

      const arch =
        createArch(x);

      elements.push(
        polyline(
          arch,
          `tunnel-rib-${i}`,
          "#60a5fa",
          1,
          0.55
        )
      );
    }

    /*
      Connect the arches
      along the tunnel.
    */

    for (
      let i = 0;
      i < frontArch.length;
      i += 3
    ) {
      elements.push(
        line(
          frontArch[i],
          backArch[i],
          `tunnel-length-${i}`,
          "#60a5fa",
          1,
          0.6
        )
      );
    }

    return elements;
  }

  /*
    =================================================
    HEMISPHERE / IGLOO
    =================================================
  */

  function renderSmoothDome(
    isIgloo = false
  ) {
    const elements: JSX.Element[] = [];

    const radius =
      Math.min(length, width) / 2;

    const latitudeSegments = 5;
    const longitudeSegments = 12;

    /*
      Horizontal latitude rings
    */

    for (
      let lat = 1;
      lat <= latitudeSegments;
      lat++
    ) {
      const phi =
        (Math.PI / 2) *
        (lat / latitudeSegments);

      const ringRadius =
        radius * Math.sin(phi);

      const z =
        radius * Math.cos(phi);

      const ring: Point3D[] = [];

      for (
        let lon = 0;
        lon < longitudeSegments;
        lon++
      ) {
        const theta =
          (Math.PI * 2 * lon) /
          longitudeSegments;

        ring.push({
          x:
            ringRadius *
            Math.cos(theta),

          y:
            ringRadius *
            Math.sin(theta),

          z,
        });
      }

      elements.push(
        polyline(
          ring,
          `dome-ring-${lat}`,
          isIgloo
            ? "#93c5fd"
            : "#3b82f6",
          1,
          0.65,
          true
        )
      );
    }

    /*
      Vertical longitude lines.
    */

    for (
      let lon = 0;
      lon < longitudeSegments;
      lon += 2
    ) {
      const theta =
        (Math.PI * 2 * lon) /
        longitudeSegments;

      const curve: Point3D[] = [];

      for (
        let lat = 0;
        lat <= latitudeSegments;
        lat++
      ) {
        const phi =
          (Math.PI / 2) *
          (lat / latitudeSegments);

        curve.push({
          x:
            radius *
            Math.sin(phi) *
            Math.cos(theta),

          y:
            radius *
            Math.sin(phi) *
            Math.sin(theta),

          z:
            radius *
            Math.cos(phi),
        });
      }

      elements.push(
        polyline(
          curve,
          `dome-longitude-${lon}`,
          isIgloo
            ? "#93c5fd"
            : "#60a5fa",
          1.2,
          0.7
        )
      );
    }

    return elements;
  }

  /*
    =================================================
    A-FRAME
    =================================================
  */

  function renderAFrame() {
    const L = length / 2;
    const W = width / 2;

    const points = [
      { x: -L, y: -W, z: 0 },
      { x: -L, y: W, z: 0 },
      { x: -L, y: 0, z: height },

      { x: L, y: -W, z: 0 },
      { x: L, y: W, z: 0 },
      { x: L, y: 0, z: height },
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],

      [3, 4],
      [4, 5],
      [5, 3],

      [0, 3],
      [1, 4],
      [2, 5],
    ];

    return edges.map(
      ([a, b], index) =>
        line(
          points[a],
          points[b],
          `aframe-${index}`,
          "#3b82f6",
          1.8
        )
    );
  }

  /*
    =================================================
    GEODESIC DOME
    =================================================

    Creates a dome using
    interconnected triangular
    structural members.
  */

  function renderGeodesic() {
    const elements: JSX.Element[] = [];

    const radius =
      Math.min(length, width) / 2;

    const rings = 5;

    /*
      Store all nodes.
    */

    const nodes:
      Point3D[][] = [];

    /*
      Top node
    */

    nodes.push([
      {
        x: 0,
        y: 0,
        z: radius,
      },
    ]);

    /*
      Create circular rings.
    */

    for (
      let ring = 1;
      ring <= rings;
      ring++
    ) {
      const phi =
        (Math.PI / 2) *
        (ring / rings);

      const ringRadius =
        radius * Math.sin(phi);

      const z =
        radius * Math.cos(phi);

      /*
        More divisions
        toward the base.
      */

      const divisions =
        6 + ring * 3;

      const ringNodes: Point3D[] =
        [];

      for (
        let i = 0;
        i < divisions;
        i++
      ) {
        /*
          Alternate ring positions
          to create triangles.
        */

        const offset =
          ring % 2 === 0
            ? Math.PI / divisions
            : 0;

        const theta =
          (Math.PI * 2 * i) /
            divisions +
          offset;

        ringNodes.push({
          x:
            ringRadius *
            Math.cos(theta),

          y:
            ringRadius *
            Math.sin(theta),

          z,
        });
      }

      nodes.push(ringNodes);
    }

    /*
      Draw rings.
    */

    nodes.forEach(
      (ring, ringIndex) => {
        if (
          ringIndex === 0 ||
          ring.length < 2
        ) {
          return;
        }

        elements.push(
          polyline(
            ring,
            `geo-ring-${ringIndex}`,
            "#3b82f6",
            1,
            0.65,
            true
          )
        );
      }
    );

    /*
      Connect rings using
      triangular members.
    */

    for (
      let ring = 0;
      ring < nodes.length - 1;
      ring++
    ) {
      const current =
        nodes[ring];

      const next =
        nodes[ring + 1];

      /*
        Top node connects
        to the first ring.
      */

      if (ring === 0) {
        next.forEach(
          (node, index) => {
            elements.push(
              line(
                current[0],
                node,
                `geo-top-${index}`,
                "#60a5fa",
                1.3,
                0.9
              )
            );
          }
        );

        continue;
      }

      /*
        Connect each node
        to two nodes below,
        creating triangles.
      */

      current.forEach(
        (node, index) => {
          const ratio =
            index / current.length;

          const nextIndex =
            Math.floor(
              ratio * next.length
            );

          const target1 =
            next[
              nextIndex %
                next.length
            ];

          const target2 =
            next[
              (nextIndex + 1) %
                next.length
            ];

          elements.push(
            line(
              node,
              target1,
              `geo-a-${ring}-${index}`,
              "#60a5fa",
              1.1,
              0.8
            )
          );

          elements.push(
            line(
              node,
              target2,
              `geo-b-${ring}-${index}`,
              "#60a5fa",
              1.1,
              0.8
            )
          );
        }
      );
    }

    return elements;
  }

  /*
    =================================================
    SELECT THE CORRECT SHAPE
    =================================================
  */

  function renderShelter() {
    switch (shape) {
      case "box":
        return renderBox();

      case "cylinder":
        return renderCylinder();

      /*
        Your project currently uses
        "dome" as Tunnel Shelter.
      */

      case "dome":
        return renderTunnel();

      case "hemisphere":
        return renderSmoothDome(false);

      case "igloo":
        return renderSmoothDome(true);

      case "geodesic":
        return renderGeodesic();

      case "a-frame":
        return renderAFrame();

      default:
        return renderBox();
    }
  }

  /*
    Convert azimuth to
    compass direction.
  */

  function getDirection() {
    const directions = [
      "N",
      "NE",
      "E",
      "SE",
      "S",
      "SW",
      "W",
      "NW",
    ];

    const index =
      Math.round(
        azimuth / 45
      ) % 8;

    return directions[index];
  }

  return (
    <div className="w-full">

      {/* 3D Shelter */}

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label={`3D ${getShapeName(
          shape
        )} rotated to ${azimuth} degrees`}
      >

        {/* Background */}

        <rect
          x="0"
          y="0"
          width={svgW}
          height={svgH}
          fill="transparent"
        />

        {/* Ground */}

        <ellipse
          cx={cx}
          cy={cy + 25}
          rx={170}
          ry={35}
          fill="#3b82f608"
          stroke="#334155"
          strokeWidth={1}
        />

        {/* Shelter */}

        {renderShelter()}

      </svg>


      {/* Orientation Information */}

      <div className="flex justify-between items-center mt-2 px-3 text-xs text-slate-400">

        <span>
          Orientation
        </span>

        <span className="font-semibold text-blue-400">
          {Math.round(azimuth)}°
          {" "}
          {getDirection()}
        </span>

      </div>

    </div>
  );
}

function ShelterPreview({
  shape,
  length,
  width,
  height,
  view,
}: {
  shape: ShelterShape;
  length: number;
  width: number;
  height: number;
  view: PreviewView;
}) {
  const svgW = 280;
  const svgH = 180;
  const pad = 20;

  const viewDimensions = {
    front: { w: width, h: height },
    side: { w: length, h: height },
    top: { w: length, h: width },
  }[view];

  const scaleX =
    (svgW - 2 * pad) / Math.max(viewDimensions.w, 1);

  const scaleY =
    (svgH - 2 * pad) / Math.max(viewDimensions.h, 1);

  const scale = Math.min(scaleX, scaleY);

  const w = viewDimensions.w * scale;
  const h = viewDimensions.h * scale;

  const x0 = (svgW - w) / 2;
  const y0 = svgH - pad;
  const topY = y0 - h;

  const blue = "#3b82f6";
  const fill = "#3b82f620";

  /*
    TUNNEL SHAPE
    Currently uses the "dome" option as the
    tunnel-shaped shelter.
  */

  const renderTunnel = () => {

    /* FRONT VIEW
       Arch-shaped cross-section
    */
    if (view === "front") {
      return (
        <g>
          <path
            d={`
              M ${x0} ${y0}
              L ${x0} ${y0 - h * 0.38}
              Q ${x0} ${topY} ${x0 + w / 2} ${topY}
              Q ${x0 + w} ${topY} ${x0 + w} ${y0 - h * 0.38}
              L ${x0 + w} ${y0}
              Z
            `}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
          />

          {/* Inner structural outline */}
          <path
            d={`
              M ${x0 + 8} ${y0}
              L ${x0 + 8} ${y0 - h * 0.36}
              Q ${x0 + 8} ${topY + 8}
                ${x0 + w / 2} ${topY + 8}
              Q ${x0 + w - 8} ${topY + 8}
                ${x0 + w - 8} ${y0 - h * 0.36}
              L ${x0 + w - 8} ${y0}
            `}
            fill="none"
            stroke={blue}
            strokeWidth={1.5}
          />
        </g>
      );
    }

    /* SIDE VIEW
       Long tunnel with repeated arch ribs
    */
    if (view === "side") {
      const ribs = 6;

      return (
        <g>

          {/* Main tunnel body */}
          <path
            d={`
              M ${x0} ${y0}
              L ${x0} ${topY + h * 0.18}
              Q ${x0} ${topY}
                ${x0 + h * 0.12} ${topY}
              L ${x0 + w - h * 0.12} ${topY}
              Q ${x0 + w} ${topY}
                ${x0 + w} ${topY + h * 0.18}
              L ${x0 + w} ${y0}
              Z
            `}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
          />

          {/* Tunnel ribs */}
          {Array.from({ length: ribs }).map((_, i) => {
            const x = x0 + ((i + 0.5) * w) / ribs;

            return (
              <path
                key={i}
                d={`
                  M ${x} ${y0}
                  L ${x} ${topY + h * 0.18}
                  Q ${x}
                    ${topY + h * 0.04}
                    ${x + h * 0.12}
                    ${topY}
                `}
                fill="none"
                stroke={blue}
                strokeWidth={1.3}
                opacity={0.75}
              />
            );
          })}

          {/* Floor */}
          <line
            x1={x0}
            y1={y0}
            x2={x0 + w}
            y2={y0}
            stroke={blue}
            strokeWidth={2}
          />

        </g>
      );
    }

    /* TOP VIEW
       Rectangular footprint
    */
    if (view === "top") {
      const ribs = 8;

      return (
        <g>

          {/* Tunnel footprint */}
          <rect
            x={x0}
            y={topY}
            width={w}
            height={h}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
          />

          {/* Structural ribs */}
          {Array.from({ length: ribs }).map((_, i) => {
            const x = x0 + ((i + 1) * w) / (ribs + 1);

            return (
              <line
                key={i}
                x1={x}
                y1={topY}
                x2={x}
                y2={y0}
                stroke={blue}
                strokeWidth={1.2}
                opacity={0.7}
              />
            );
          })}

        </g>
      );
    }

    return null;
  };


  const renderShape = () => {

    /*
      USE DOME OPTION AS TUNNEL
    */

    if (shape === "dome") {
      return renderTunnel();
    }


    switch (shape) {

      case "box":
        return (
          <rect
            x={x0}
            y={topY}
            width={w}
            height={h}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
            rx={4}
          />
        );


      case "cylinder":

        if (view === "top") {
          return (
            <ellipse
              cx={x0 + w / 2}
              cy={topY + h / 2}
              rx={w / 2}
              ry={h / 2}
              fill={fill}
              stroke={blue}
              strokeWidth={2}
            />
          );
        }

        return (
          <rect
            x={x0}
            y={topY}
            width={w}
            height={h}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
          />
        );


      case "hemisphere":

        if (view === "top") {
          return (
            <ellipse
              cx={x0 + w / 2}
              cy={topY + h / 2}
              rx={w / 2}
              ry={h / 2}
              fill={fill}
              stroke={blue}
              strokeWidth={2}
            />
          );
        }

        return (
          <path
            d={`
              M ${x0} ${y0}
              A ${w / 2} ${h} 0 0 1 ${x0 + w} ${y0}
              Z
            `}
            fill={fill}
            stroke={blue}
            strokeWidth={2}
          />
        );


      case 'a-frame':
  if (view === 'top') {
    return (
      <g>
        <rect
          x={x0}
          y={topY}
          width={w}
          height={h}
          fill="#3b82f620"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        <line
          x1={x0 + w / 2}
          y1={topY}
          x2={x0 + w / 2}
          y2={y0}
          stroke="#3b82f6"
          strokeWidth={2}
        />
      </g>
    );
  }

  if (view === 'side') {
    return (
      <rect
        x={x0}
        y={topY}
        width={w}
        height={h}
        fill="#3b82f620"
        stroke="#3b82f6"
        strokeWidth={2}
      />
    );
  }

  // Front view
  return (
    <path
      d={`M ${x0} ${y0} L ${x0 + w / 2} ${topY} L ${x0 + w} ${y0} Z`}
      fill="#3b82f620"
      stroke="#3b82f6"
      strokeWidth={2}
    />
  );
      case 'igloo':
  if (view === 'top') {
    return (
      <ellipse
        cx={x0 + w / 2}
        cy={topY + h / 2}
        rx={w / 2}
        ry={h / 2}
        fill="#3b82f620"
        stroke="#3b82f6"
        strokeWidth={2}
      />
    );
  }

  return (
    <g>
      {/* Igloo dome */}
      <path
        d={`
          M ${x0} ${y0}
          Q ${x0 + w / 2} ${topY}
          ${x0 + w} ${y0}
          Z
        `}
        fill="#3b82f620"
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {/* Inner curved line */}
      <path
        d={`
          M ${x0 + w * 0.1} ${y0}
          Q ${x0 + w / 2} ${topY + h * 0.12}
          ${x0 + w * 0.9} ${y0}
        `}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.2}
        opacity={0.7}
      />
    </g>
  );

      case 'geodesic': {

  /*
    ==========================================
    GEODESIC DOME
    ==========================================

    FRONT / SIDE:
    Dome profile with triangular framework.

    TOP:
    Circular footprint with radial structural
    divisions.
  */


  /* =========================================
     TOP VIEW
  ========================================= */

  if (view === 'top') {

    const cx = x0 + w / 2;
    const cy = topY + h / 2;

    const rx = w / 2;
    const ry = h / 2;

    const segments = 10;

    const points: string[] = [];

    for (let i = 0; i < segments; i++) {

      const angle =
        (Math.PI * 2 * i) / segments -
        Math.PI / 2;

      const px =
        cx + rx * Math.cos(angle);

      const py =
        cy + ry * Math.sin(angle);

      points.push(`${px},${py}`);
    }


    return (

      <g>

        {/* Circular / elliptical footprint */}

        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="#3b82f610"
          stroke="#3b82f6"
          strokeWidth={2}
        />


        {/* Outer radial framework */}

        {points.map((point, i) => {

          const [px, py] =
            point.split(',').map(Number);

          return (

            <line
              key={`radial-${i}`}
              x1={cx}
              y1={cy}
              x2={px}
              y2={py}
              stroke="#3b82f6"
              strokeWidth={1}
              opacity={0.65}
            />

          );

        })}


        {/* Inner structural polygon */}

        <polygon
          points={points
            .map((_, i) => {

              const angle =
                (Math.PI * 2 * i) / segments -
                Math.PI / 2;

              const px =
                cx +
                rx * 0.5 *
                Math.cos(angle);

              const py =
                cy +
                ry * 0.5 *
                Math.sin(angle);

              return `${px},${py}`;

            })
            .join(' ')
          }

          fill="none"

          stroke="#3b82f6"

          strokeWidth={1.2}

          opacity={0.8}
        />


        {/* Inner radial connections */}

        {points.map((_, i) => {

          const angle =
            (Math.PI * 2 * i) / segments -
            Math.PI / 2;


          const outerX =
            cx +
            rx *
            Math.cos(angle);

          const outerY =
            cy +
            ry *
            Math.sin(angle);


          const innerAngle =
            angle + Math.PI / segments;


          const innerX =
            cx +
            rx * 0.5 *
            Math.cos(innerAngle);

          const innerY =
            cy +
            ry * 0.5 *
            Math.sin(innerAngle);


          return (

            <line
              key={`geo-${i}`}
              x1={outerX}
              y1={outerY}
              x2={innerX}
              y2={innerY}
              stroke="#3b82f6"
              strokeWidth={1}
              opacity={0.55}
            />

          );

        })}

      </g>

    );

  }


  /* =========================================
     FRONT AND SIDE VIEW
  ========================================= */


  const cx =
    x0 + w / 2;


  /*
    Dome structural levels
  */

  const levels = [

    {
      y: y0,
      width: w
    },

    {
      y: y0 - h * 0.25,
      width: w * 0.9
    },

    {
      y: y0 - h * 0.5,
      width: w * 0.68
    },

    {
      y: y0 - h * 0.72,
      width: w * 0.42
    },

    {
      y: y0 - h * 0.9,
      width: w * 0.18
    }

  ];


  /*
    Number of structural nodes
    per horizontal level
  */

  const nodesPerLevel = [
    7,
    6,
    5,
    4,
    2
  ];


  const levelNodes:
    { x: number; y: number }[][] =
    [];


  levels.forEach((level, levelIndex) => {

    const count =
      nodesPerLevel[levelIndex];


    const nodes:
      { x: number; y: number }[] =
      [];


    for (let i = 0; i < count; i++) {

      const startX =
        cx - level.width / 2;


      const spacing =
        count > 1
          ? level.width / (count - 1)
          : 0;


      nodes.push({

        x:
          startX +
          spacing * i,

        y:
          level.y

      });

    }


    levelNodes.push(nodes);

  });


  return (

    <g>


      {/* =====================================
          DOME OUTLINE
      ====================================== */}

      <path

        d={`
          M ${x0} ${y0}

          Q
          ${x0}
          ${topY + h * 0.1}

          ${cx}
          ${topY}

          Q
          ${x0 + w}
          ${topY + h * 0.1}

          ${x0 + w}
          ${y0}

          Z
        `}

        fill="#3b82f610"

        stroke="#3b82f6"

        strokeWidth={2}

      />


      {/* =====================================
          HORIZONTAL STRUCTURAL RINGS
      ====================================== */}

      {levels.slice(1).map(
        (level, index) => (

          <line

            key={`ring-${index}`}

            x1={
              cx -
              level.width / 2
            }

            y1={level.y}

            x2={
              cx +
              level.width / 2
            }

            y2={level.y}

            stroke="#3b82f6"

            strokeWidth={1}

            opacity={0.65}

          />

        )
      )}


      {/* =====================================
          TRIANGULAR GEODESIC CONNECTIONS
      ====================================== */}

      {levelNodes.map(
        (nodes, levelIndex) => {

          if (
            levelIndex ===
            levelNodes.length - 1
          ) {
            return null;
          }


          const nextNodes =
            levelNodes[levelIndex + 1];


          return (

            <g
              key={`level-${levelIndex}`}
            >


              {nodes.map(
                (node, nodeIndex) => {


                  /*
                    Connect each node
                    to the nearest nodes
                    on the next level.
                  */


                  const ratio =
                    nodeIndex /
                    Math.max(
                      nodes.length - 1,
                      1
                    );


                  const nextIndex =
                    Math.round(
                      ratio *
                      (nextNodes.length - 1)
                    );


                  const connections =
                    [
                      nextIndex,
                      Math.min(
                        nextIndex + 1,
                        nextNodes.length - 1
                      )
                    ];


                  return (

                    <g
                      key={`node-${nodeIndex}`}
                    >


                      {connections.map(
                        (
                          targetIndex,
                          connectionIndex
                        ) => {


                          const target =
                            nextNodes[targetIndex];


                          if (!target) {
                            return null;
                          }


                          return (

                            <line

                              key={
                                `connection-${connectionIndex}`
                              }

                              x1={node.x}

                              y1={node.y}

                              x2={target.x}

                              y2={target.y}

                              stroke="#60a5fa"

                              strokeWidth={1.2}

                              opacity={0.75}

                            />

                          );

                        }
                      )}


                    </g>

                  );

                }
              )}


            </g>

          );

        }
      )}


      {/* =====================================
          BASE STRUCTURE
      ====================================== */}

      <line

        x1={x0}

        y1={y0}

        x2={x0 + w}

        y2={y0}

        stroke="#3b82f6"

        strokeWidth={2}

      />


      {/* =====================================
          VERTICAL / DIAGONAL FRAME MEMBERS
      ====================================== */}

      {levelNodes[0].map(
        (node, index) => {

          if (
            index === 0 ||
            index ===
            levelNodes[0].length - 1
          ) {
            return null;
          }


          const targetIndex =
            Math.round(
              index *
              (levelNodes[1].length - 1) /
              (levelNodes[0].length - 1)
            );


          const target =
            levelNodes[1][targetIndex];


          return (

            <line

              key={`base-${index}`}

              x1={node.x}

              y1={node.y}

              x2={target.x}

              y2={target.y}

              stroke="#60a5fa"

              strokeWidth={1}

              opacity={0.65}

            />

          );

        }
      )}


    </g>

  );

}

      default:
        return null;
    }
  };


  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full"
      role="img"
      aria-label={`${view} shelter view`}
    >

      {/* Ground line */}
      {view !== "top" && (
        <line
          x1={pad - 10}
          y1={y0}
          x2={svgW - pad + 10}
          y2={y0}
          stroke="#475569"
          strokeWidth={1}
        />
      )}

      {renderShape()}


      {/* Horizontal dimension */}
      <text
        x={x0 + w / 2}
        y={y0 + 15}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
      >
        {viewDimensions.w.toFixed(1)}m
      </text>


      {/* Vertical dimension */}
      <text
        x={x0 - 12}
        y={y0 - h / 2}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        transform={`rotate(-90, ${x0 - 12}, ${y0 - h / 2})`}
      >
        {viewDimensions.h.toFixed(1)}m
      </text>

    </svg>
  );
}

export default function ShelterPage() {
  const { state, dispatch } = useApp();
  const { shelter } = state;
  
  const update = (changes: Partial<typeof shelter>) => {
    dispatch({ type: 'SET_SHELTER', payload: changes });
  };

  const geometry = calculateGeometry(
    shelter.shape, shelter.length, shelter.width, shelter.height, shelter.azimuth
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Shelter Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shape Selection */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">Shape</div>
            <div className="grid grid-cols-5 gap-2">
              {SHELTER_SHAPES.map(s => (
                <button
                  key={s}
                  onClick={() => update({ shape: s })}
                  className={`flex flex-col items-center p-2 rounded text-xs transition-colors ${
                    shelter.shape === s
                      ? 'bg-blue-600/30 border border-blue-500 text-blue-400'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl mb-1">{SHAPE_ICONS[s]}</span>
                  <span className="text-[10px] leading-tight text-center">{getShapeName(s).split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="card">
            <div className="card-header">Dimensions</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Length [m]</label>
                <input className="input-field" type="number" min="1" max="50" step="0.5" value={shelter.length} onChange={e => update({ length: parseFloat(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="input-label">Width [m]</label>
                <input className="input-field" type="number" min="1" max="50" step="0.5" value={shelter.width} onChange={e => update({ width: parseFloat(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="input-label">Height [m]</label>
                <input className="input-field" type="number" min="1" max="20" step="0.1" value={shelter.height} onChange={e => update({ height: parseFloat(e.target.value) || 1 })} />
              </div>
            </div>
          </div>

          {/* Orientation */}
          <div className="card">
            <div className="card-header">Orientation</div>
            <div>
              <label className="input-label">Azimuth [0-360°] (0=N, 90=E, 180=S, 270=W)</label>
              <input className="input-field" type="number" min="0" max="360" step="5" value={shelter.azimuth} onChange={e => update({ azimuth: parseFloat(e.target.value) || 0 })} />
              <input type="range" min="0" max="360" step="5" value={shelter.azimuth} onChange={e => update({ azimuth: parseFloat(e.target.value) })} className="w-full mt-2 accent-blue-500" />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>N (0°)</span><span>E (90°)</span><span>S (180°)</span><span>W (270°)</span><span>N (360°)</span>
              </div>
            </div>
          </div>

          {/* Occupancy & Ventilation */}
          <div className="card">
            <div className="card-header">Occupancy & Ventilation</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Occupants</label>
                <input className="input-field" type="number" min="0" max="50" value={shelter.occupancy} onChange={e => update({ occupancy: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="input-label">Ventilation [ACH]</label>
                <input className="input-field" type="number" min="0" max="10" step="0.1" value={shelter.ventilationACH} onChange={e => update({ ventilationACH: parseFloat(e.target.value) || 0 })} />
                <p className="text-[10px] text-slate-500 mt-1">Air changes per hour. Typical: 0.3–0.6 for sealed shelter</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Calculated */}
        <div className="lg:col-span-2 space-y-4">
          {/* SVG Preview */}
          <div className="card">
            <div className="card-header">Shelter Views</div>
            <div className="grid grid-cols-3 gap-3">
              {(['front', 'side', 'top'] as PreviewView[]).map(view => (
                <div key={view} className="rounded-lg border border-slate-700 bg-slate-950/40 p-2">
                  <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{view}</div>
                  <ShelterPreview shape={shelter.shape} length={shelter.length} width={shelter.width} height={shelter.height} view={view} />
                </div>
              ))}
            </div>
          </div>
          
           <div className="card">

            <div className="card-header">
              3D Shelter Orientation
            </div>

            <Shelter3DPreview
              shape={shelter.shape}
              length={shelter.length}
              width={shelter.width}
              height={shelter.height}
              azimuth={shelter.azimuth}
            />

          </div>

          {/* Calculated Geometry */}
          <div className="card">
            <div className="card-header">Calculated Geometry</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-lg font-semibold text-white">{geometry.volume.toFixed(1)}</div>
                <div className="text-xs text-slate-500">Volume [m³]</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{geometry.wallArea.toFixed(1)}</div>
                <div className="text-xs text-slate-500">Wall Area [m²]</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{geometry.roofArea.toFixed(1)}</div>
                <div className="text-xs text-slate-500">Roof Area [m²]</div>
              </div>
              <div>
                <div classNames="text-lg font-semibold text-white">{geometry.floorArea.toFixed(1)}</div>
                <div className="text-xs text-slate-500">Floor Area [m²]</div>
              </div>
            </div>
          </div>

          {/* Surface Orientations */}
          <div className="card">
            <div className="card-header">Surface Orientations</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-right py-2 px-3">Area [m²]</th>
                    <th className="text-right py-2 px-3">Tilt [°]</th>
                    <th className="text-right py-2 px-3">Azimuth [°]</th>
                    <th className="text-left py-2 pl-3">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {geometry.facesWithOrientations.map((face, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-1.5 pr-4 text-slate-400">{i + 1}</td>
                      <td className="text-right py-1.5 px-3">{face.area.toFixed(2)}</td>
                      <td className="text-right py-1.5 px-3">{face.tilt.toFixed(0)}</td>
                      <td className="text-right py-1.5 px-3">{face.azimuth.toFixed(0)}</td>
                      <td className="py-1.5 pl-3 text-slate-400">{face.tilt === 0 ? 'Roof' : face.tilt === 90 ? 'Wall' : 'Sloped'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}