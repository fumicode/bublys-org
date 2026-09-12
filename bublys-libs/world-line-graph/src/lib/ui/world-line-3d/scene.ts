/**
 * scene.ts — **'three' を静的 import してよい唯一のファイル**。
 *
 * ここをバレル（ui/index.ts）から export してはいけない。到達経路は
 * WorldLine3DView.tsx の useEffect 内の `await import('./scene.js')` だけにする。
 * こうしておくと、
 *   - Next.js（bublys-os）の SSR に構造的に到達しない
 *   - 初期バンドルにも、バブリの IIFE（bubly.js）にも three が入らない
 *   - Jest がこのファイルを読み込まない（純粋関数だけをテストできる）
 * の4つが同時に守られる。
 *
 * OrbitControls / CSS2DRenderer / Sprite は使わない（camera.ts / picking.ts /
 * plateCanvas.ts のコメント参照）。カメラとピッキングは自前の純粋関数で、
 * 文字は板のキャンバスと DOM の HUD に出す。
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Layout3D, Nest3D, Plate3D } from './types.js';
import type { RefLocation } from '../refLocation.js';
import { ACTION_COLOR, PALETTE_3D, ROLE_COLOR, cellStyle } from './palette3d.js';
import { paintPlate, plateCanvasSize } from './plateCanvas.js';
import { DEFAULT_FOV_DEG, orbitToPosition, type Orbit } from './camera.js';
// ★ セルの位置は layout3d の1箇所から取る。式を書き写すとずれる（実際にずれていた）
import { changedBoxTransform } from './geometry.js';

/** いま選んでいる世界（板1枚）。線や箱はスコープ単位なので、文字列に潰さず組で持つ */
export type Selection = { readonly scopeId: string; readonly nodeId: string };

export type SceneOptions = {
  readonly plateThickness: number;
  readonly changedThickness: number;
  readonly cellPitch: number;
  readonly cell: number;
  readonly locate?: (hash: string) => RefLocation;
  /** テクスチャを焼く板の上限。超えた分は単色で「要約表示」する */
  readonly maxTexturedPlates: number;
};

export type SceneStats = {
  readonly plates: number;
  readonly texturedPlates: number;
  readonly summarizedPlates: number;
  readonly changedCells: number;
  readonly drawCalls: number;
};

export type WorldLine3DScene = {
  update(layout: Layout3D, opts: SceneOptions, selected: Selection | null): SceneStats;
  setOrbit(orbit: Orbit): void;
  resize(width: number, height: number): void;
  /** カメラ姿勢（ピッキングに使う） */
  readonly camera: { position: [number, number, number]; fov: number; aspect: number };
  dispose(): void;
};

/**
 * 同時に生きている WebGL コンテキストの数。ブラウザには上限（16 前後）があり、
 * 超えると古いものが黙って失われる。バブルは何枚でも開けるので、
 * **黙って真っ黒になる前に**作るのをやめて理由を出せるようにしておく。
 */
let liveContexts = 0;
export const MAX_LIVE_CONTEXTS = 4;
export function liveContextCount() {
  return liveContexts;
}

export class TooManyContextsError extends Error {
  constructor() {
    super(`3D ビューは同時に ${MAX_LIVE_CONTEXTS} 枚までです`);
    this.name = 'TooManyContextsError';
  }
}

export function createWorldLine3DScene(
  container: HTMLElement,
  initialOrbit: Orbit
): WorldLine3DScene {
  if (liveContexts >= MAX_LIVE_CONTEXTS) throw new TooManyContextsError();

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  liveContexts++;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  // setSize(w, h, false) は style を書かないので、CSS 側で伸ばす
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(PALETTE_3D.background);
  // 画角は camera.ts の1箇所から取る。ここに数字を書き直すと、fitOrbit と applyPan の
  // 換算だけが別の画角で計算されて、寸法合わせと平行移動の手応えが静かにずれる
  const camera = new PerspectiveCamera(DEFAULT_FOV_DEG, 1, 0.1, 100000);

  // 使い回す資源（update のたびに作り直さない）
  const plateGeoCache = new Map<string, PlaneGeometry>();
  const boxGeo = new BoxGeometry(1, 1, 1);
  const disposables: { dispose(): void }[] = [boxGeo];
  let plateMeshes: Mesh[] = [];
  let cellMesh: InstancedMesh | null = null;
  let edgeLines: LineSegments | null = null;
  let nestLines: LineSegments | null = null;
  let identityLines: LineSegments | null = null;
  let nestSurface: Mesh | null = null;
  let orbit = initialOrbit;

  const applyCamera = () => {
    const p = orbitToPosition(orbit);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(orbit.target[0], orbit.target[1], orbit.target[2]);
    camera.updateMatrixWorld();
  };

  const clearGroup = () => {
    for (const m of plateMeshes) {
      scene.remove(m);
      (m.material as MeshBasicMaterial).map?.dispose();
      (m.material as MeshBasicMaterial).dispose();
    }
    plateMeshes = [];
    if (cellMesh) {
      scene.remove(cellMesh);
      // ★ InstancedMesh は Object3D 側の dispose が要る。呼ばないと
      //   instanceMatrix / instanceColor の GL バッファが update のたびに漏れる
      //   （three は 'dispose' イベントでしか deleteBuffer しない）。
      cellMesh.dispose();
      (cellMesh.material as { dispose(): void }).dispose();
      // geometry（boxGeo）は使い回している共有物なので、ここでは解放しない
    }
    // 漏斗の面（Mesh）も線と同じく update ごとに作り直す。
    // ここで解放しないと GL バッファが1回ごとに漏れる。
    // ★ disposables には入れないこと。あれは使い回す資源（boxGeo 等）だけの置き場で、
    //   毎回作り直すものを入れると配列が update のたびに伸びる
    for (const obj of [edgeLines, nestLines, identityLines, nestSurface]) {
      if (!obj) continue;
      scene.remove(obj);
      obj.geometry.dispose();
      (obj.material as { dispose(): void }).dispose();
    }
    cellMesh = null;
    edgeLines = null;
    nestLines = null;
    identityLines = null;
    nestSurface = null;
  };

  const plateGeometry = (extentZ: number, extentY: number): PlaneGeometry => {
    const key = `${extentZ}x${extentY}`;
    let geo = plateGeoCache.get(key);
    if (!geo) {
      // 板は YZ 平面に立てる（法線が +X ＝ 時間軸）。
      // 回転で local +x → world -z、local +y → world +y になる。
      geo = new PlaneGeometry(extentZ, extentY);
      geo.rotateY(Math.PI / 2);
      plateGeoCache.set(key, geo);
      disposables.push(geo);
    }
    return geo;
  };

  function buildLines(
    segments: {
      from: readonly number[];
      to: readonly number[];
      color: string;
      opacity?: number;
    }[]
  ): LineSegments | null {
    if (segments.length === 0) return null;
    const pos = new Float32Array(segments.length * 6);
    const col = new Float32Array(segments.length * 6);
    const c = new Color();
    segments.forEach((s, i) => {
      pos.set([s.from[0], s.from[1], s.from[2], s.to[0], s.to[1], s.to[2]], i * 6);
      c.set(s.color);
      // 線ごとの濃さは頂点カラーの明るさで出す（マテリアルは1つしか持てないので）
      const a = s.opacity ?? 1;
      col.set([c.r * a, c.g * a, c.b * a, c.r * a, c.g * a, c.b * a], i * 6);
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 3));
    // WebGL の線幅は常に 1px。太さでは描き分けられないので色と本数で区別する
    const mat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
    return new LineSegments(geo, mat);
  }

  /**
   * 入れ子の漏斗の「面」。親セルの小さな口から、その世界の手前の面へ広がる四角錐台。
   *
   * 線1本だと「この ■ の中がこの世界です」という**包含**が読めない。
   * 面にすると、口から奥へ広がって世界を包んでいるのが一目で出る。
   *
   * 口も奥も Z 法線（入れ子の段の方向）なので、i と i+1 を素直に結べばねじれない。
   * ここを板と同じ X 法線にすると、口と奥が同じ x 平面に乗って4枚が1枚に潰れる。
   *
   * ★ kind の描き分けは色ではなく**奥側の頂点α**でやる:
   *     linked  … 奥まで一様。親の状態に子の現在地が入っている＝最後まで親が握っている
   *     nominal … 奥へ向かって消える。名前が揃っているだけで、奥は親に握られていない
   *   ここを一様にすると「連動しないものを連動するように描く」＝types.ts の禁止事項。
   */
  function buildNestSurface(nests: readonly Nest3D[]): Mesh | null {
    if (nests.length === 0) return null;
    // 漏斗1本 = 側面4枚 = 三角形8枚 = 頂点24
    const pos = new Float32Array(nests.length * 24 * 3);
    // ★ itemSize は 4（RGBA）。3 にすると three は α を見ない
    const col = new Float32Array(nests.length * 24 * 4);
    const c = new Color();
    let vi = 0;
    for (const n of nests) {
      c.set(n.kind === 'linked' ? PALETTE_3D.nestLinked : PALETTE_3D.nestNominal);
      const aFar = n.kind === 'linked' ? 1 : 0.15;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const quad: [readonly number[], number][] = [
          [n.mouth[i], 1],
          [n.mouth[j], 1],
          [n.far[j], aFar],
          [n.far[i], aFar],
        ];
        for (const k of [0, 1, 2, 0, 2, 3]) {
          const [pt, a] = quad[k];
          pos.set([pt[0], pt[1], pt[2]], vi * 3);
          col.set([c.r, c.g, c.b, a], vi * 4);
          vi++;
        }
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 4));
    const mat = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      // 板（下地 0.42）を通して読めるだけの薄さ。DoubleSide なので見通すと
      // 表と裏の2枚を通り、実効は 1-(1-a)^2 になる
      opacity: 0.14,
      side: DoubleSide,
      // 板と同じ。深度を書くと奥の板を隠してしまう
      depthWrite: false,
    });
    const mesh = new Mesh(geo, mat);
    // 板より先に描く（three の透明パスは renderOrder 昇順）。
    // 膜が板の絵の上に乗ると中身が読めなくなるので、必ず膜を先に置く
    mesh.renderOrder = -1;
    return mesh;
  }

  function update(layout: Layout3D, opts: SceneOptions, selected: Selection | null): SceneStats {
    clearGroup();

    // --- 板 ---------------------------------------------------------------
    // 手前（＝カメラに近い）から順にテクスチャを配る。溢れた分は単色の要約表示
    const camPos = new Vector3(...orbitToPosition(orbit));
    const ordered = [...layout.plates].sort(
      (a, b) =>
        camPos.distanceToSquared(new Vector3(...a.origin)) -
        camPos.distanceToSquared(new Vector3(...b.origin))
    );
    let textured = 0;
    for (const plate of ordered) {
      const geo = plateGeometry(plate.extentZ, plate.extentY);
      let material: MeshBasicMaterial;
      const isSelected =
        selected !== null &&
        selected.scopeId === plate.scopeId &&
        selected.nodeId === plate.nodeId;
      if (textured < opts.maxTexturedPlates) {
        const canvas = document.createElement('canvas');
        const grid = { cols: plate.cols, rows: plate.rows };
        const size = plateCanvasSize(grid);
        canvas.width = size.width;
        canvas.height = size.height;
        paintPlate(canvas, plate, { ...grid, locate: opts.locate, selected: isSelected });
        const tex = new CanvasTexture(canvas);
        // 既定は NoColorSpace。設定しないと板の絵と 3D の箱で同じ色が違って出る
        tex.colorSpace = SRGBColorSpace;
        material = new MeshBasicMaterial({
          map: tex,
          side: DoubleSide,
          transparent: true,
          // 半透明の板を何枚も重ねるので、深度を書かずに奥から順に混ぜる。
          // 書くと手前の板が奥の板を隠して「積み重なり」が見えなくなる
          depthWrite: false,
        });
        textured++;
      } else {
        material = new MeshBasicMaterial({
          color: new Color(PALETTE_3D.plate),
          side: DoubleSide,
          transparent: true,
          opacity: PALETTE_3D.plateOpacity,
          depthWrite: false,
        });
      }
      const mesh = new Mesh(geo, material);
      mesh.position.set(plate.origin[0], plate.origin[1], plate.origin[2]);
      scene.add(mesh);
      plateMeshes.push(mesh);
    }

    // --- 変わったセルだけを箱にして、板から -X（過去側）へ伸ばす -----------
    // 出来事（作られた・変わった）のあったセルだけを箱にして立てる。
    // 消されたもの（墓標）は伸ばさない。何も起きていないものは板の絵のまま
    const changed: { plate: Plate3D; cell: Plate3D['cells'][number] }[] = [];
    for (const plate of layout.plates) {
      for (const cell of plate.cells) {
        if (cell.action === 'created' || cell.action === 'changed') {
          changed.push({ plate, cell });
        }
      }
    }
    if (changed.length > 0) {
      // ★ vertexColors は付けない。付けると vertex 側で USE_COLOR が立ち、
      //   BoxGeometry に無い color 属性（＝0）を掛けて**箱が真っ黒になる**。
      //   instanceColor があれば three が USE_INSTANCING_COLOR と fragment 側の
      //   USE_COLOR を自分で立てるので、setColorAt だけで色が出る。
      const mat = new MeshBasicMaterial({});
      const mesh = new InstancedMesh(boxGeo, mat, changed.length);
      const m = new Matrix4();
      const color = new Color();
      changed.forEach(({ plate, cell }, i) => {
        const style = cellStyle(cell, opts.locate?.(cell.hash) ?? 'memory', opts.changedThickness);
        // ★ 式を書き写さない。板の絵はラベル帯（上）と型名欄（左）のぶん内側に
        //   セルを置いているので、素の (row+0.5)/(col+0.5) だと箱だけが
        //   型名欄の上に浮く。姿勢は geometry.ts の純粋関数が持ち、テストが数値で固定する
        const box = changedBoxTransform(plate, cell.slot, opts, style.thickness);
        m.makeScale(box.scale[0], box.scale[1], box.scale[2]);
        m.setPosition(box.position[0], box.position[1], box.position[2]);
        mesh.setMatrixAt(i, m);
        color.set(style.color);
        // 選択中は「その板の箱」だけ素の色。ほかは沈める（背景が暗いので暗く＝奥へ引く）。
        // 箱は不透明パスに出るため、薄くしても手前に居座る。明るさで引っ込めるしかない
        if (selected && !(plate.scopeId === selected.scopeId && plate.nodeId === selected.nodeId)) {
          color.multiplyScalar(0.4);
        }
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // 視錐台カリングを切る。geometry.boundingSphere をいじってはいけない
      // （boxGeo は全インスタンスで共有しているので、書き換えると他にも波及する）
      mesh.frustumCulled = false;
      scene.add(mesh);
      cellMesh = mesh;
    }

    // --- 世界線のエッジ ----------------------------------------------------
    edgeLines = buildLines(
      layout.edges.map((e) => ({
        from: e.from,
        to: e.to,
        color: e.kind === 'branch' ? PALETTE_3D.edgeBranch : PALETTE_3D.edgeTime,
      }))
    );
    if (edgeLines) scene.add(edgeLines);

    // --- 同一性のレール（同じオブジェクトを時間方向につなぐ） ---------------
    // 席が固定なので、この線は時間軸に平行なまっすぐな線になる。
    // 出来事の無かった区間は淡く、出来事のあった先は出来事の色で出す
    identityLines = buildLines(
      layout.identities.map((l) => {
        // 固定メンバーは構造上ずっと「そのまま」なので、淡灰にすると図から消える。
        // シアンで通して「打ち込まれた杭」として見せる（線幅は WebGL では常に 1px
        // なので、太さでは描き分けられない。色と濃さで出すしかない）
        const pinnedStill = l.role === 'pinned' && l.action === 'unchanged';
        return {
          from: l.from,
          to: l.to,
          color: pinnedStill ? (ROLE_COLOR.pinned as string) : ACTION_COLOR[l.action],
          opacity: pinnedStill ? 0.5 : l.action === 'unchanged' ? 0.16 : 0.8,
        };
      })
    );
    if (identityLines) scene.add(identityLines);

    // --- 入れ子の漏斗 ------------------------------------------------------
    // 連動するもの（アドレス連動）と、名前が揃っているだけのものを色で分ける。
    // 連動しないものを連動するように描いたら嘘になる。
    nestSurface = buildNestSurface(layout.nests);
    if (nestSurface) scene.add(nestSurface);
    // 背骨と稜線は残す。面がエッジオンになる向きでは膜が消えるので、
    // 線が無いと入れ子そのものが図から落ちる
    nestLines = buildLines([
      ...layout.nests.map((n) => ({
        from: n.from,
        to: n.to,
        color: n.kind === 'linked' ? PALETTE_3D.nestLinked : PALETTE_3D.nestNominal,
      })),
      ...layout.nests.flatMap((n) =>
        [0, 1, 2, 3].map((i) => ({
          from: n.mouth[i],
          to: n.far[i],
          color: n.kind === 'linked' ? PALETTE_3D.nestLinked : PALETTE_3D.nestNominal,
          // 膜を濃くするより、稜線のほうが形が読める。
          // nominal は稜線も薄く＝奥が親に握られていないことを線でも言う
          opacity: n.kind === 'linked' ? 0.55 : 0.22,
        }))
      ),
    ]);
    if (nestLines) scene.add(nestLines);

    applyCamera();
    renderer.render(scene, camera);

    return {
      plates: layout.plates.length,
      texturedPlates: textured,
      summarizedPlates: layout.plates.length - textured,
      changedCells: changed.length,
      drawCalls: renderer.info.render.calls,
    };
  }

  function resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    applyCamera();
    renderer.render(scene, camera);
  }

  function setOrbit(next: Orbit) {
    orbit = next;
    applyCamera();
    renderer.render(scene, camera);
  }

  function dispose() {
    clearGroup();
    for (const d of disposables) d.dispose();
    plateGeoCache.clear();
    renderer.dispose();
    // 明示的にコンテキストを手放す（バブルは何枚も開け閉めされる）
    renderer.forceContextLoss();
    renderer.domElement.remove();
    liveContexts = Math.max(0, liveContexts - 1);
  }

  applyCamera();

  return {
    update,
    setOrbit,
    resize,
    get camera() {
      const p = orbitToPosition(orbit);
      return { position: p as [number, number, number], fov: camera.fov, aspect: camera.aspect };
    },
    dispose,
  };
}
