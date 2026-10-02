'use client';
/**
 * 地図の絵 ── **本物の地図（OpenStreetMap）の上**に、この空間のピンと道を重ねる。
 *
 * ★ **地の絵は Leaflet に任せる。** 前は湖と道を緯度経度から SVG で描いていたので、
 *   寄っても細かくならず、箱根の外へ出れば何も無かった。タイルなら
 *   どこへ行っても地図があり、寄れば寄ったぶん出る。
 * ★ **ピンは Leaflet のマーカーにしない。** ピンは「掴んで運べるもの」（`ObjectView`）で
 *   なければならない ── それがバブリどうしの繋がり方そのものだから。
 *   なので位置だけ Leaflet に訊いて（`latLngToContainerPoint`）、中身は自分で描く。
 * ★ **映している範囲の持ち主は Leaflet。** 人が触って動くのはあちらなので、
 *   動き終わったら「いまここです」と外へ言う。外から範囲を渡されたときだけ合わせる
 *   ── 両方が持ち主になると、動かすたびに押し合って止まらなくなる。
 */
import {
  ComponentPropsWithoutRef,
  DragEvent as ReactDragEvent,
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
/**
 * ★ **型だけを持ってくる**（`import type`）。Leaflet は読み込んだ時点で `window` を
 *   触るので、ふつうに import するとサーバ側の下描きで落ちる
 *   （実測：`next build` が `/_not-found` の書き出しで止まる）。
 *   実体はブラウザに着いてから読む（下の `useEffect`）。
 */
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { MapBounds_範囲 } from "../domain/MapBounds.domain.js";

/**
 * 地図に出る点 1 つ。
 *
 * ★ **地点（`Spot`）ではない。** 緯度経度さえ分かっていれば何でもここに来る
 *   ── 描く側は、それが何の型だったかを知らなくてよい。
 */
export type MapPin = {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly color: string;
  /** 開ける先。無ければ掴めるだけ */
  readonly url?: string;
  readonly type: string;
};

export type MapViewProps = {
  bounds: MapBounds_範囲;
  pins: readonly MapPin[];
  /** いま指されているもの。ピンが光る */
  focusedId?: string | null;
  /** 道として繋ぐ点の並び（渡されたものの順） */
  /**
   * **道**（ピンの id の並び）を、**渡したもの 1 つにつき 1 本**。
   *
   * ★ 前は 1 本だけだった。渡されたものを足せるようにすると、1 本では
   *   **旅程の最後の立ち寄り先と、次に落とした宿が線で繋がる** ── 行ってもいない道ができる。
   */
  routes?: readonly (readonly string[])[];
  /** 人が動かし終わったときの「いまここです」 */
  onBoundsChange?: (next: MapBounds_範囲) => void;
  /** ピンを指したとき */
  onPinFocus?: (id: string) => void;
  /** 探す範囲が決まっているか（ボタンの見た目に出す） */
  /** 受け取れる荷物か（`dragover` では型しか読めない） */
  canAccept?: (e: ReactDragEvent) => boolean;
  /** 落ちてきたもの。受けられたら true */
  onDropPayload?: (e: ReactDragEvent) => boolean;
  /** 出ているピンを消す口。何も渡されていなければ出さない */
  onClearHanded?: () => void;
};

/**
 * **地の絵は地理院タイル（淡色地図）。**
 *
 * ★ **淡色にしたのは、この上に色を重ねるから。** ピンも道もこちらが色を持つので、
 *   地が濃いと線がどれだけ地の道で、どれだけ旅程の道なのか読み分けられない。
 *   標準地図（`std`）にしたければ URL の `pale` を `std` に替えるだけ。
 * ★ **日本の外には出ない。** 地理院タイルは日本とその周りだけなので、
 *   海外の旅程では地が白くなる（ピンと道はそのまま出る）。
 *   世界を映したいなら、ここを別の出どころに替える（`README` を見よ）。
 * ★ 出典は消さないこと。**承認なしで使える条件がこれ**（国土地理院コンテンツ利用規約）。
 */
const TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>（国土地理院）';
/** タイルのある縮尺。これより引くと地が無くなる */
const TILE_MIN_ZOOM = 5;
const TILE_MAX_ZOOM = 18;

/** 道の見た目。渡されたもののピンの色と揃える */
const ROUTE_STYLE = { color: "#1f6fd0", weight: 3, dashArray: "6 5", opacity: 0.9 };

/** 同じ範囲と見なす幅（度）。浮動小数の丸めで押し合いが起きない程度に */
const EPS = 1e-7;

const toLatLngBounds = (b: MapBounds_範囲): LeafletNS.LatLngBoundsExpression => [
  [b.south, b.west],
  [b.north, b.east],
];

export const MapView: FC<MapViewProps> = ({
  bounds,
  pins,
  focusedId,
  routes,
  onBoundsChange,
  onPinFocus,
  canAccept,
  onDropPayload,
  onClearHanded,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const routeRef = useRef<LeafletNS.Polyline[]>([]);
  /** Leaflet の実体。ブラウザに着いてから入る */
  const [L, setL] = useState<typeof LeafletNS | null>(null);
  /**
   * 描き直しの合図。地図が動くたびに増える。
   * ピンの位置は Leaflet に訊かないと分からないので、動いたら描き直す必要がある。
   */
  const [beat, setBeat] = useState(0);
  /** 外から渡された範囲を合わせている最中か（そのあいだは外へ言い返さない） */
  const applyingRef = useRef(false);
  /**
   * いまの「外へ言う口」。覚え書きで持つ ── 依存に入れて地図を立て直すと、
   * 触っている最中にタイルが消える。
   */
  const reportRef = useRef(onBoundsChange);
  reportRef.current = onBoundsChange;
  /** 最初に映す範囲。立てるときに 1 回だけ読む */
  const initialBoundsRef = useRef(bounds);

  /** Leaflet を読む（ブラウザでだけ。1 回だけ） */
  useEffect(() => {
    let alive = true;
    import("leaflet").then((m) => {
      if (alive) setL((m.default ?? m) as typeof LeafletNS);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 地図を 1 つ立てる（Leaflet が着いてから、1 回だけ） */
  useEffect(() => {
    const el = boxRef.current;
    if (!L || !el || mapRef.current) return;

    const map = L.map(el, {
      // 口は自分で出す（岸に貼った小さな泡でも邪魔にならない大きさにしたい）
      zoomControl: false,
      attributionControl: true,
      // タイルのある範囲の外へは出さない ── 出ると地が真っ白になる
      minZoom: TILE_MIN_ZOOM,
      maxZoom: TILE_MAX_ZOOM,
    });
    L.tileLayer(TILE_URL, {
      minZoom: TILE_MIN_ZOOM,
      maxZoom: TILE_MAX_ZOOM,
      // 地理院タイルの決まり。出典と一覧への道は必ず出す
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    map.fitBounds(toLatLngBounds(initialBoundsRef.current));
    mapRef.current = map;

    const settled = () => {
      setBeat((n) => n + 1);
      if (applyingRef.current) return;
      const b = map.getBounds();
      reportRef.current?.(
        MapBounds_範囲.fromPlain({
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
        }),
      );
    };
    map.on("moveend", settled);
    map.on("zoomend", settled);
    /** 動いている最中もピンを付いてこさせる ── 置いていかれると地図から浮く */
    map.on("move", () => setBeat((n) => n + 1));

    setBeat((n) => n + 1);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // 立てるのは Leaflet が着いたとき 1 回だけ。範囲の追従は下の effect が受け持つ
  }, [L]);

  /**
   * **箱の大きさが変わったら、地図に教える。**
   * 泡は大きさが変わるものなので、教えないとタイルが古い大きさのまま欠ける。
   */
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
      setBeat((n) => n + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * 外から範囲を渡されたら合わせる。
   *
   * ★ **自分が動いて外へ言った結果が返ってきただけなら、動かさない。**
   *   合わせ直すと、その動きがまた外へ出て、押し合いが止まらなくなる。
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const now = map.getBounds();
    if (
      Math.abs(now.getSouth() - bounds.south) < EPS &&
      Math.abs(now.getNorth() - bounds.north) < EPS &&
      Math.abs(now.getWest() - bounds.west) < EPS &&
      Math.abs(now.getEast() - bounds.east) < EPS
    ) {
      return;
    }
    applyingRef.current = true;
    map.fitBounds(toLatLngBounds(bounds));
    // 合わせ終わってから解く（`moveend` はこのあと来る）
    window.setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }, [bounds]);

  /** 道 ── 渡された順に繋ぐ。地の上に引くので Leaflet に描かせる */
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;
    for (const line of routeRef.current) line.remove();
    routeRef.current = [];
    for (const ids of routes ?? []) {
      if (ids.length < 2) continue;
      const latLngs = ids
        .map((id) => pins.find((p) => p.id === id))
        .filter((p): p is MapPin => p !== undefined)
        .map((p) => [p.lat, p.lng] as [number, number]);
      if (latLngs.length < 2) continue;
      routeRef.current.push(L.polyline(latLngs, ROUTE_STYLE).addTo(map));
    }
  }, [L, routes, pins]);

  /** 面ぜんぶが受け皿（ポケット・旅程と同じ決まり） */
  const [dragOver, setDragOver] = useState(false);
  const handleDragOver = (e: ReactDragEvent) => {
    if (!onDropPayload || !canAccept?.(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };
  const handleDragLeave = (e: ReactDragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };
  const handleDrop = (e: ReactDragEvent) => {
    setDragOver(false);
    if (onDropPayload?.(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /** 画面の中のどこに出すか。**Leaflet に訊く**（地の絵と同じ写し方でなければずれる） */
  const pointOf = useCallback(
    (pin: MapPin): { x: number; y: number } | null => {
      const map = mapRef.current;
      if (!map) return null;
      const p = map.latLngToContainerPoint([pin.lat, pin.lng]);
      const size = map.getSize();
      if (p.x < -60 || p.y < -60 || p.x > size.x + 60 || p.y > size.y + 60) return null;
      return { x: p.x, y: p.y };
    },
    // 地図が動くたびに引き直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beat],
  );

  const zoom = (by: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + by);
  };

  return (
    <StyledMap
      data-drag-over={dragOver ? "on" : "off"}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 地の絵（タイル）。Leaflet がこの中を全部描く */}
      <div ref={boxRef} className="e-ground" />

      {/* ピンは地の絵の上に重ねる ── 1 つ 1 つが掴める「もの」なので、自分で描く */}
      {pins.map((pin) => {
        const at = pointOf(pin);
        if (!at) return null;
        const focused = pin.id === focusedId;
        return (
          <div
            key={`${pin.type}/${pin.id}`}
            className={`e-pin ${focused ? "is-focused" : ""}`}
            style={{ left: at.x, top: at.y }}
          >
            <ObjectView
              type={pin.type}
              url={pin.url}
              id={pin.id}
              label={pin.name}
              openingPosition="bubble-side-right"
              draggable
              onClick={() => onPinFocus?.(pin.id)}
            >
              <span className="e-pin-body">
                <span className="e-pin-dot" style={{ background: pin.color }} />
                <span className="e-pin-name">{pin.name}</span>
              </span>
            </ObjectView>
          </div>
        );
      })}

      <div className="e-controls">
        <button type="button" onClick={() => zoom(1)} title="寄る">＋</button>
        <button type="button" onClick={() => zoom(-1)} title="引く">−</button>
      </div>

      <div className="e-topleft">
        {/* 出ているピンを消す。何も渡されていなければ出さない */}
        {onClearHanded && (
          <button type="button" className="e-search" onClick={onClearHanded}>
            ピンを消す
          </button>
        )}
      </div>
    </StyledMap>
  );
};

const StyledMap = styled.div<ComponentPropsWithoutRef<'div'>>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  font: 11px/1.4 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;

  /* 受け取れるものを掴んで来たら、面ぜんぶが受け皿だと判るようにする */
  &[data-drag-over='on'] {
    box-shadow: inset 0 0 0 3px #1f6fd0;
  }

  .e-ground {
    position: absolute;
    inset: 0;
    /* タイルが来るまでの地。真っ白より、地図らしい色のほうが欠けて見えない */
    background: #dfe6e2;
  }

  /* 出典は小さく、でも必ず読める所に（OpenStreetMap の決まり） */
  .leaflet-control-attribution {
    font-size: 9px;
    background: rgba(255, 255, 255, 0.75);
  }

  .e-pin {
    position: absolute;
    /* 点が地点の真上に来るように、印のぶんだけ持ち上げる */
    transform: translate(-6px, -6px);
    white-space: nowrap;
    /* タイルより前。Leaflet の面は 400 番台を使う */
    z-index: 500;
  }
  .e-pin-body {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 3px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 11px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    color: #1b2029;
  }
  .e-pin-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
  }
  .e-pin-name { max-width: 108px; overflow: hidden; text-overflow: ellipsis; }

  /* 指されているものは光る ── 旅程でもアクティビティでも、同じものなら同時に光る */
  .e-pin.is-focused {
    z-index: 600;
  }
  .e-pin.is-focused .e-pin-body {
    background: #fffbe6;
    border-color: #f0b429;
    box-shadow: 0 0 0 3px rgba(240, 180, 41, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
    font-weight: bold;
  }

  .e-controls {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 600;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .e-controls button {
    width: 26px;
    height: 26px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.95);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }

  .e-topleft {
    position: absolute;
    left: 8px;
    top: 8px;
    z-index: 600;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: calc(100% - 50px);
  }

  .e-search {
    padding: 4px 10px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.95);
    font-size: 11px;
    cursor: pointer;
    color: #1b2029;
  }
  .e-search.is-on {
    background: #1f6fd0;
    border-color: #1f6fd0;
    color: #fff;
  }
`;
