import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { Plus, ArrowLeft, Pencil, Trash2, X, ImagePlus, Music2, Check, Menu, ArrowUpDown, ListMusic, AlertTriangle, Search, Play, Pause, RotateCcw, Timer, Minus, Undo2, Archive, Copy, Download, Upload, Lightbulb, MousePointer2, Scissors, Hand, Eye, EyeOff, Redo2 } from "lucide-react";

/*
  가사 보관함 — 개인 노래 가사 아카이브
  - 표지 사진 / 제목 / 가사만 저장 (음원 파일 없음)
  - window.storage 로 영구 저장 (개인 데이터)
*/

const STORAGE_KEY = "songs";
const MAX_IMAGE_DIM = 640;

function resizeImageToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 불러오지 못했어요"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_IMAGE_DIM) {
          height = Math.round((height * MAX_IMAGE_DIM) / width);
          width = MAX_IMAGE_DIM;
        } else if (height > MAX_IMAGE_DIM) {
          width = Math.round((width * MAX_IMAGE_DIM) / height);
          height = MAX_IMAGE_DIM;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-wrap">
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="empty-disc">
        <circle cx="44" cy="44" r="40" fill="#20222b" stroke="#3a3d4a" strokeWidth="1.5" />
        <circle cx="44" cy="44" r="30" fill="none" stroke="#2c2f39" strokeWidth="1" />
        <circle cx="44" cy="44" r="22" fill="none" stroke="#2c2f39" strokeWidth="1" />
        <circle cx="44" cy="44" r="7" fill="#f5f5f7" />
      </svg>
      <p className="empty-title">아직 기록된 노래가 없어요</p>
      <p className="empty-sub">좋아하는 노래의 가사와 표지를 담아두세요</p>
      <button className="btn-primary" onClick={onAdd}>
        <Plus size={17} strokeWidth={2.25} />
        <span>첫 노래 기록하기</span>
      </button>
    </div>
  );
}

function SongCard({ song, index, onOpen, vtName }) {
  return (
    <button
      className="song-card"
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
      onClick={(e) => onOpen(song, e.currentTarget.querySelector(".song-cover"))}
    >
      <div className="song-cover" style={vtName ? { viewTransitionName: "song-cover" } : undefined}>
        {song.cover ? (
          <img src={song.cover} alt="" />
        ) : (
          <div className="song-cover-fallback">
            <Music2 size={26} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="song-meta">
        <div className="song-title">{song.title || "제목 없음"}</div>
        <div className="song-preview">{(song.lyrics || "").split("\n")[0] || "가사 미리보기 없음"}</div>
      </div>
    </button>
  );
}

function DetailView({ song, onBack, onEdit, onDelete, onSing, onRecord, onLights }) {
  const [confirming, setConfirming] = useState(false);
  useWakeLock(true);
  const synced = !!(song.timings && song.timings.length);
  const wrapRef = useRef(null);
  useSwipeDismiss(wrapRef, {
    canStart: () => !!wrapRef.current && wrapRef.current.scrollTop <= 0,
    drag: (el, v, p) => {
      el.style.transform = `translateY(${v}px) scale(${1 - p * 0.06})`;
      el.style.opacity = String(1 - p * 0.45);
    },
    out: (el) => {
      el.style.transform = "translateY(28%) scale(0.92)";
      el.style.opacity = "0";
    },
    reset: (el) => {
      el.style.transform = "";
      el.style.opacity = "";
    },
    onDismiss: () => onBack({ swipe: true }),
  });
  return (
    <div className="detail-wrap" ref={wrapRef}>
      <div className="detail-top">
        <button className="icon-btn" onClick={() => onBack()} aria-label="뒤로">
          <ArrowLeft size={20} />
        </button>
        <div className="detail-actions">
          <button className="icon-btn" onClick={() => onEdit(song)} aria-label="수정">
            <Pencil size={17} />
          </button>
          {!confirming ? (
            <button className="icon-btn danger" onClick={() => setConfirming(true)} aria-label="삭제">
              <Trash2 size={17} />
            </button>
          ) : (
            <div className="confirm-row">
              <span>삭제할까요?</span>
              <button className="confirm-yes" onClick={() => onDelete(song.id)}>삭제</button>
              <button className="confirm-no" onClick={() => setConfirming(false)}>취소</button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-hero">
        {song.cover && <div className="detail-bg" style={{ backgroundImage: `url(${song.cover})` }} />}
        <div className="detail-cover" style={{ viewTransitionName: "song-cover" }}>
          {song.cover ? (
            <img src={song.cover} alt="" />
          ) : (
            <div className="song-cover-fallback large">
              <Music2 size={40} strokeWidth={1.3} />
            </div>
          )}
        </div>
        <h1 className="detail-title">{song.title || "제목 없음"}</h1>
        <div className="detail-cta">
          <button className="pill-btn" onClick={() => onSing(song)}>
            <Play size={15} fill="currentColor" />
            <span>부르기</span>
          </button>
          <button className="pill-btn ghost" onClick={() => onRecord(song)}>
            {synced ? <Check size={15} /> : <Timer size={15} />}
            <span>싱크</span>
          </button>
          <button className="pill-btn ghost" onClick={() => onLights(song)}>
            {songHasLights(song) ? <Check size={15} /> : <Lightbulb size={15} />}
            <span>라이트</span>
          </button>
        </div>
      </div>

      <div className="lyrics-card">
        <pre className="lyrics-text">{song.lyrics ? song.lyrics.split("\n").map((l) => l.trim()).join("\n") : "등록된 가사가 없어요."}</pre>
      </div>
    </div>
  );
}

function SongForm({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [lyrics, setLyrics] = useState(initial?.lyrics || "");
  const [cover, setCover] = useState(initial?.cover || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataURL(file);
      setCover(dataUrl);
    } catch (err) {
      setError("이미지 처리에 실패했어요. 다른 사진으로 시도해보세요.");
    } finally {
      setBusy(false);
    }
  };

  const canSave = title.trim().length > 0;

  return (
    <div className="sheet-body">
      <div className="sheet-drag">
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2>{initial ? "노래 수정" : "새 노래 기록"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="sheet-scroll">
        <label className="field-label">타이틀 사진</label>
        <button
          type="button"
          className="cover-picker"
          onClick={() => fileRef.current?.click()}
        >
          {cover ? (
            <img src={cover} alt="표지 미리보기" />
          ) : (
            <div className="cover-picker-empty">
              <ImagePlus size={22} strokeWidth={1.5} />
              <span>사진 선택</span>
            </div>
          )}
        </button>
        {cover && (
          <button type="button" className="link-btn" onClick={() => setCover("")}>
            사진 제거
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ display: "none" }}
        />
        {busy && <p className="hint">이미지 처리 중…</p>}
        {error && <p className="hint error">{error}</p>}

        <label className="field-label" style={{ marginTop: 20 }}>제목</label>
        <input
          className="text-input"
          placeholder="노래 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />

        <label className="field-label" style={{ marginTop: 20 }}>가사</label>
        <textarea
          className="lyrics-input"
          placeholder={"가사를 줄바꿈 그대로 붙여넣어도 좋아요"}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={12}
        />
      </div>

      <div className="sheet-footer">
        <button className="btn-ghost" onClick={onCancel}>취소</button>
        <button
          className="btn-primary"
          disabled={!canSave}
          onClick={() => onSave({ title: title.trim(), lyrics, cover })}
        >
          <Check size={17} strokeWidth={2.25} />
          <span>저장</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- 공용 헬퍼 ---------- */
function getTimeableIndices(lyrics) {
  return (lyrics || "")
    .split("\n")
    .map((l, i) => (l.trim() ? i : -1))
    .filter((i) => i >= 0);
}

// 엔터(빈 줄)로 나뉜 문단 하나를 한 단위로 묶는다.
// size 0 = 문단 전체, 1 = 한 줄씩 (그 외 숫자는 문단 안에서 n줄씩)
function getGroups(lyrics, size) {
  const n = size === 0 ? Infinity : Math.max(1, size || 1);
  const groups = [];
  let cur = [];
  const flush = () => {
    for (let i = 0; i < cur.length; i += n) groups.push(cur.slice(i, i + n));
    cur = [];
  };
  (lyrics || "").split("\n").forEach((l, i) => {
    if (l.trim()) cur.push(i);
    else flush();
  });
  flush();
  return groups;
}

function formatClock(ms) {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useWakeLock(active) {
  useEffect(() => {
    if (!active) return;
    let lock = null;
    let cancelled = false;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
          if (cancelled && lock) lock.release().catch(() => {});
        }
      } catch (e) {
        // 지원하지 않거나 권한이 없는 환경
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}

/* ---------- 햅틱 / 쓸어내려 닫기 ---------- */
// 짧고 약한 진동 (지원하지 않는 기기에서는 아무 일도 일어나지 않음)
function haptic(ms = 10) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    // 진동 미지원
  }
}

// 손가락을 따라 내려가고, 충분히 내리면 닫히고, 아니면 제자리로 돌아오는 제스처
function useSwipeDismiss(ref, opts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let tracking = false;
    let active = false;
    let startX = 0;
    let startY = 0;
    let dy = 0;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;

    const begin = (target, x, y) => {
      const o = optsRef.current;
      if (o.enabled === false) return false;
      if (o.canStart && !o.canStart(target)) return false;
      tracking = true;
      active = false;
      startX = x;
      startY = y;
      dy = 0;
      lastY = y;
      lastT = performance.now();
      vel = 0;
      return true;
    };

    const apply = (v) => {
      const o = optsRef.current;
      const p = Math.min(1, v / 420);
      if (o.drag) o.drag(el, v, p);
      else el.style.transform = `translateY(${v}px)`;
    };

    const move = (x, y, e) => {
      if (!tracking) return;
      const ddy = y - startY;
      const ddx = x - startX;
      if (!active) {
        if (ddy > 8 && Math.abs(ddy) > Math.abs(ddx) * 1.2) {
          active = true;
          el.style.transition = "none";
        } else if (Math.abs(ddx) > 10 || ddy < -8) {
          tracking = false;
          return;
        } else {
          return;
        }
      }
      if (e && e.cancelable) e.preventDefault();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) vel = vel * 0.6 + ((y - lastY) / dt) * 0.4;
      lastY = y;
      lastT = now;
      dy = ddy > 0 ? ddy * (1 - Math.min(0.3, ddy / 1800)) : 0;
      apply(dy);
    };

    const end = () => {
      if (!tracking) return;
      tracking = false;
      if (!active) return;
      active = false;
      const o = optsRef.current;
      const close = dy > (o.threshold || 110) || (dy > 24 && vel > 0.6);
      if (close) {
        el.style.transition = "transform 0.26s cubic-bezier(0.4, 0, 0.8, 0.3), opacity 0.26s ease";
        if (o.out) o.out(el);
        else el.style.transform = "translateY(100%)";
        setTimeout(() => {
          if (o.onDismiss) o.onDismiss();
        }, 240);
      } else {
        el.style.transition = "transform 0.42s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.3s ease";
        if (o.reset) o.reset(el);
        else el.style.transform = "";
        setTimeout(() => {
          el.style.transition = "";
        }, 430);
      }
    };

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      begin(e.target, t.clientX, t.clientY);
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY, e);
    };
    const onTouchEnd = () => end();

    const onMouseMove = (e) => move(e.clientX, e.clientY, e);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      end();
    };
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (begin(e.target, e.clientX, e.clientY)) {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("mousedown", onMouseDown);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
}

// 등록 시트: 윗부분(손잡이+제목)을 잡고 아래로 내리면 닫힌다
function Sheet({ closing, onDismiss, children }) {
  const panelRef = useRef(null);
  useSwipeDismiss(panelRef, {
    enabled: !closing,
    canStart: (t) => !!(t && t.closest && t.closest(".sheet-drag")),
    drag: (el, v, p) => {
      el.style.transform = `translateY(${v}px)`;
      if (el.parentElement) el.parentElement.style.opacity = String(1 - p * 0.6);
    },
    out: (el) => {
      el.style.transform = "translateY(100%)";
      if (el.parentElement) {
        el.parentElement.style.transition = "opacity 0.26s ease";
        el.parentElement.style.opacity = "0";
      }
    },
    reset: (el) => {
      el.style.transform = "";
      if (el.parentElement) {
        el.parentElement.style.transition = "opacity 0.3s ease";
        el.parentElement.style.opacity = "";
      }
    },
    onDismiss,
  });
  return (
    <div className={"sheet-overlay" + (closing ? " closing" : "")}>
      <div id="sheet-panel" ref={panelRef}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 조명 시스템 (왼쪽·오른쪽·위·아래를 각각 제어) ---------- */
const LIGHT_SIDES = [
  { id: "left", label: "왼쪽", key: "←" },
  { id: "right", label: "오른쪽", key: "→" },
  { id: "top", label: "위", key: "↑" },
  { id: "bottom", label: "아래", key: "↓" },
];
const LIGHT_COLORS = ["#ffffff", "#ff3b30", "#ff9500", "#ffd60a", "#30d158", "#64d2ff", "#5e5ce6", "#ff375f"];
const LIGHT_TYPES = [
  { id: "solid", label: "고정", key: "Q" },
  { id: "breathe", label: "숨쉬기", key: "W" },
  { id: "strobe", label: "스트로브", key: "E" },
  { id: "off", label: "끄기", key: "0" },
];

/* ---------- 라이트 데이터: 구간(clip) 방식 — 켜짐~꺼짐이 하나의 덩어리 ---------- */
const MIN_CLIP = 80; // 구간 최소 길이(ms)
const uid = () => Math.random().toString(36).slice(2, 9);

const normClip = (c) => ({
  ...c,
  id: c.id || uid(),
  keys: [...(c.keys || [])]
    .map((k) => ({ id: k.id || uid(), t: k.t, v: k.v }))
    .sort((a, b) => a.t - b.t),
});

// 예전 형식(켜짐/꺼짐 컷)도 구간으로 바꿔서 불러온다
function clipsFromSong(song) {
  if (Array.isArray(song.lightClips)) return song.lightClips.map(normClip);
  const cues = [...(song.lights || [])].sort((a, b) => a.t - b.t);
  const lastT = cues.length ? cues[cues.length - 1].t : 0;
  const out = [];
  LIGHT_SIDES.forEach(({ id }) => {
    const list = cues.filter((c) => c.side === id);
    list.forEach((c, i) => {
      if (c.type === "off") return;
      const nxt = list[i + 1];
      const end = nxt ? nxt.t : lastT + 1000;
      if (end - c.t >= 1) out.push(normClip({ side: id, start: c.t, end, color: c.color, type: c.type }));
    });
  });
  return out;
}
const songHasLights = (s) => !!((s.lightClips && s.lightClips.length) || (s.lights && s.lights.length));

// 키프레임 사이 밝기(0~1)를 직선으로 보간
function kAt(clip, t) {
  const ks = clip.keys;
  if (!ks || !ks.length) return 1;
  if (t <= ks[0].t) return ks[0].v;
  const last = ks[ks.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t >= a.t && t <= b.t) return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
  }
  return last.v;
}

// 시간 ms 시점의 방향별 조명 상태
function lightsFromClips(clips, ms) {
  const out = {};
  const best = {};
  for (const c of clips) {
    if (c.start <= ms && ms < c.end && (best[c.side] === undefined || c.start >= best[c.side])) {
      best[c.side] = c.start;
      out[c.side] = { color: c.color, type: c.type, k: kAt(c, ms) };
    }
  }
  return out;
}
function lightKey(state) {
  return LIGHT_SIDES.map((s) => {
    const c = state[s.id];
    return c ? `${c.color}${c.type}${(c.k == null ? 1 : c.k).toFixed(2)}` : "-";
  }).join("|");
}

// 새 구간이 같은 방향의 기존 구간과 겹치면 기존 쪽을 잘라낸다 (덮어쓰기)
function overwrite(clips, nc) {
  const out = [];
  for (const c of clips) {
    if (c.id === nc.id || c.side !== nc.side || c.end <= nc.start || c.start >= nc.end) {
      out.push(c);
      continue;
    }
    if (c.start < nc.start) out.push({ ...c, end: nc.start, keys: c.keys.filter((k) => k.t <= nc.start) });
    if (c.end > nc.end) {
      out.push({ ...c, id: c.start < nc.start ? uid() : c.id, start: nc.end, keys: c.keys.filter((k) => k.t >= nc.end) });
    }
  }
  out.push(nc);
  return out;
}

// 재생헤드 위치에서 구간 나누기 (Ctrl+K)
function splitClip(clips, id, t) {
  const c = clips.find((x) => x.id === id);
  if (!c || t <= c.start + MIN_CLIP || t >= c.end - MIN_CLIP) return clips;
  const v = kAt(c, t);
  const has = c.keys.length > 0;
  const left = { ...c, end: t, keys: [...c.keys.filter((k) => k.t < t), ...(has ? [{ id: uid(), t, v }] : [])] };
  const right = { ...c, id: uid(), start: t, keys: [...(has ? [{ id: uid(), t, v }] : []), ...c.keys.filter((k) => k.t > t)] };
  return clips.map((x) => (x.id === id ? left : x)).concat(right);
}

// 삭제하고 뒤 구간을 앞으로 당기기 (Shift+Delete)
function rippleDelete(clips, id) {
  const c = clips.find((x) => x.id === id);
  if (!c) return clips;
  const len = c.end - c.start;
  return clips
    .filter((x) => x.id !== id)
    .map((x) =>
      x.side === c.side && x.start >= c.end
        ? { ...x, start: x.start - len, end: x.end - len, keys: x.keys.map((k) => ({ ...k, t: k.t - len })) }
        : x
    );
}

// 같은 방향 이웃 구간까지 움직일 수 있는 거리(ms)
function limits(others, side, ref) {
  let lo = -Infinity;
  let hi = Infinity;
  others.forEach((c) => {
    if (c.side !== side) return;
    if (c.end <= ref.start) lo = Math.max(lo, c.end - ref.start);
    else if (c.start >= ref.end) hi = Math.min(hi, c.start - ref.end);
  });
  return { lo, hi };
}

const fmtMs = (ms) => {
  const t = Math.max(0, ms) / 1000;
  return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
};
const QUICK_COLORS = ["#ffffff", "#ff3b30", "#ff9500", "#ffd60a", "#30d158", "#2ee6d6", "#0a84ff", "#5e5ce6", "#bf5af2", "#ff375f"];
const HUES = [0, 18, 36, 52, 75, 110, 150, 172, 192, 212, 236, 262, 288, 316, 340];
const PALETTE = [78, 58, 40].flatMap((l) => HUES.map((h) => `hsl(${h} ${l === 78 ? 95 : 90}% ${l}%)`));
const ALL_SIDES = ["left", "right", "top", "bottom"];
const TYPE_NAMES = { solid: "고정", breathe: "숨쉬기", strobe: "스트로브" };
const LANE_H = 56;
const LANE_GAP = 6;
const RULER_H = 24;
const CLIP_H = LANE_H - 12;

/* ---------- 라이트 설정 화면 보조 함수 ---------- */
const DEFAULT_SLOTS = [...QUICK_COLORS];
const ppsToSlider = (p) => Math.round((Math.log(p / 4) / Math.log(100)) * 100);
const sliderToPps = (s) => 4 * Math.pow(100, s / 100);

// 끈 방향(눈 아이콘)은 상태에서 빼낸다
function applyMute(state, muted) {
  if (!muted) return state;
  const o = { ...state };
  Object.keys(muted).forEach((sd) => { if (muted[sd]) delete o[sd]; });
  return o;
}

function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    const x = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(x * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}
function toHex(color) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  const m = /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/.exec(color || "");
  if (!m) return "#ffffff";
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

/* ---------- 라이트 렌더: 실제 조명처럼 부드럽게 번지는 빛 ---------- */
function LightRig({ state, cfg }) {
  const depth = (cfg && cfg.depth) || 14;
  const power = (cfg && cfg.power) || 0.9;
  return (
    <div className="lt-rig" style={{ "--dp": depth, "--pw": power }} aria-hidden="true">
      {LIGHT_SIDES.map(({ id }) => {
        const c = state[id];
        return (
          <div key={id} className={`lt-w lt-${id}`} style={{ opacity: c ? (c.k == null ? 1 : c.k) : 0 }}>
            <div className={`lt t-${c ? c.type : "off"}`} style={{ "--c": c ? c.color : "#000000" }} />
          </div>
        );
      })}
    </div>
  );
}

// 구간 안의 밝기 곡선(키프레임)
function KeyCurve({ clip, w, h, selected, selKeyId, onKeyDown }) {
  const span = Math.max(1, clip.end - clip.start);
  const X = (t) => ((t - clip.start) / span) * w;
  const Y = (v) => (1 - v) * (h - 4) + 2;
  const inner = clip.keys.filter((k) => k.t > clip.start && k.t < clip.end);
  const pts = [{ t: clip.start, v: kAt(clip, clip.start) }, ...inner, { t: clip.end, v: kAt(clip, clip.end) }];
  const toStr = (arr) => arr.map((p) => `${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const flat = clip.keys.length === 0;
  return (
    <svg className="ls-curve" width={w} height={h}>
      {!flat && <polygon points={`0,0 ${w},0 ${toStr(pts.slice().reverse())}`} fill="rgba(0,0,0,0.5)" />}
      {(selected || !flat) && <polyline points={toStr(pts)} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" />}
      {selected &&
        clip.keys.map((k) => (
          <circle
            key={k.id}
            cx={X(k.t)}
            cy={Y(k.v)}
            r={selKeyId === k.id ? 6 : 4.5}
            fill={selKeyId === k.id ? "#fff" : "#111"}
            stroke="#fff"
            strokeWidth="1.5"
            style={{ pointerEvents: "all", cursor: "grab" }}
            onPointerDown={(e) => onKeyDown(e, k)}
          />
        ))}
    </svg>
  );
}

// 직접 고르기: 앱 디자인에 맞춘 색 선택기 (색상 막대 + 채도/명도 판 + 16진수)
function ColorPicker({ value, onChange }) {
  const hex = toHex(value);
  const [hsv, setHsv] = useState(() => hexToHsv(hex));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const last = useRef(hex);
  const [text, setText] = useState(hex);
  useEffect(() => {
    if (hex !== last.current) {
      last.current = hex;
      setHsv(hexToHsv(hex));
    }
    setText(hex);
  }, [hex]);
  const emit = (n) => {
    setHsv(n);
    hsvRef.current = n;
    const x = hsvToHex(n.h, n.s, n.v);
    last.current = x;
    onChange(x);
  };
  const dragSV = (e) => {
    e.preventDefault();
    const el = e.currentTarget;
    const move = (ev) => {
      const r = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const v = 1 - Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      emit({ ...hsvRef.current, s, v });
    };
    move(e);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="cp">
      <div className="cp-sv" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }} onPointerDown={dragSV}>
        <span className="cp-knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>
      <input className="cp-hue" type="range" min="0" max="360" step="1" value={Math.round(hsv.h)} onChange={(e) => emit({ ...hsv, h: Number(e.target.value) })} />
      <div className="cp-row">
        <span className="cp-dot" style={{ background: hex }} />
        <input
          className="cp-hex"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const m = /^#?([0-9a-f]{6})$/i.exec(t.trim());
            if (m) {
              const x = `#${m[1].toLowerCase()}`;
              last.current = x;
              setHsv(hexToHsv(x));
              onChange(x);
            }
          }}
        />
      </div>
    </div>
  );
}

/* ---------- 라이트 설정 화면 (프리미어 편집 화면 구성: 소스 · 모니터 · 효과 컨트롤 · 타임라인) ---------- */
function LightStudio({ song, onClose, onSave }) {
  const lines = useMemo(() => (song.lyrics || "").split("\n"), [song.lyrics]);
  const groups = useMemo(() => getGroups(song.lyrics, song.groupSize ?? 1), [song.lyrics, song.groupSize]);
  const timings = song.timings && song.timings.length === groups.length ? song.timings : null;

  const [clips, setClipsState] = useState(() => clipsFromSong(song));
  const clipsRef = useRef(clips);
  const histRef = useRef({ past: [], future: [] });
  const [cfg, setCfgState] = useState({ depth: 14, power: 0.9, ...(song.lightCfg || {}) });
  const cfgRef = useRef(cfg);
  const dirtyRef = useRef(false);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const muted = cfg.muted || {};

  const [phase, setPhase] = useState("ready"); // ready | count | running | paused
  const [count, setCount] = useState(3);
  const [clock, setClock] = useState(0);
  const clockRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const [held, setHeld] = useState({});
  const heldRef = useRef({});
  const [cur, setCur] = useState({ color: DEFAULT_SLOTS[0], type: "solid", v: 1 });
  const [rec, setRec] = useState(false);
  const [selIds, setSelIds] = useState([]);
  const [selKeyId, setSelKeyId] = useState(null);
  const [tool, setTool] = useState("select"); // select | razor | hand
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [marquee, setMarquee] = useState(null);
  const [pps, setPps] = useState(40);
  const ppsRef = useRef(40);
  const [snapOn, setSnapOn] = useState(true);
  const snapRef = useRef(true);
  snapRef.current = snapOn;
  const [view, setView] = useState({ sl: 0, cw: 0 });
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const navRef = useRef(null);
  const clipboardRef = useRef(null);

  useWakeLock(true);

  const selSet = new Set(selIds);
  const selClip = clips.find((c) => c.id === selIds[selIds.length - 1]) || null;

  const setClips = (next) => {
    clipsRef.current = next;
    setClipsState(next);
    dirtyRef.current = true;
  };
  const pushHistory = () => {
    const h = histRef.current;
    h.past.push(clipsRef.current);
    if (h.past.length > 100) h.past.shift();
    h.future = [];
  };
  const commit = (next) => {
    pushHistory();
    setClips(next);
  };
  const undo = () => {
    const h = histRef.current;
    if (!h.past.length) return;
    h.future.push(clipsRef.current);
    setClips(h.past.pop());
  };
  const redo = () => {
    const h = histRef.current;
    if (!h.future.length) return;
    h.past.push(clipsRef.current);
    setClips(h.future.pop());
  };
  const setCfg = (patch) => {
    const n = { ...cfgRef.current, ...patch };
    cfgRef.current = n;
    setCfgState(n);
    dirtyRef.current = true;
  };
  const flush = () => {
    if (dirtyRef.current) {
      dirtyRef.current = false;
      if (saveRef.current) saveRef.current(clipsRef.current, cfgRef.current);
    }
  };
  useEffect(() => () => flush(), []);

  // 번호 키(1~0)에 할당한 색은 앱을 다시 열어도 남는다
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("lightSlots", false);
        if (r && r.value) {
          const a = JSON.parse(r.value);
          if (Array.isArray(a) && a.length === 10) setSlots(a);
        }
      } catch (e) {
        // 저장된 값 없음
      }
    })();
  }, []);
  const saveSlots = (arr) => {
    setSlots(arr);
    try {
      window.storage.set("lightSlots", JSON.stringify(arr), false).catch(() => {});
    } catch (e) {
      // 저장 실패는 무시
    }
  };
  const assignSlot = (i) => saveSlots(slots.map((c, j) => (j === i ? cur.color : c)));
  const resetSlots = () => saveSlots([...DEFAULT_SLOTS]);

  // ---- 시계 ----
  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) {
      startRef.current = performance.now() - clockRef.current;
      setPhase("running");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "running") return;
    let last = 0;
    const tick = () => {
      const now = performance.now() - startRef.current;
      clockRef.current = now;
      let next = clipsRef.current;
      let grown = false;
      Object.values(heldRef.current).forEach((h) => {
        if (!h.clipId) return;
        next = next.map((c) => (c.id === h.clipId && c.end < now ? ((grown = true), { ...c, end: now }) : c));
      });
      if (grown) setClips(next);
      if (now - last > 33) {
        last = now;
        setClock(now);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const begin = () => { setCount(3); setPhase("count"); };
  const resume = () => { startRef.current = performance.now() - clockRef.current; setPhase("running"); };
  const pause = () => { releaseAll(); flush(); setClock(clockRef.current); setPhase("paused"); };
  const restart = () => { releaseAll(); flush(); clockRef.current = 0; setClock(0); setPhase("ready"); };
  const close = () => { releaseAll(); flush(); onClose(); };
  const seekTo = (ms) => {
    const t = Math.max(0, Math.round(ms));
    clockRef.current = t;
    setClock(t);
    if (phase === "running") startRef.current = performance.now() - t;
  };

  // ---- 누르는 동안 켜짐 / 떼면 꺼짐 (녹화 중이면 구간으로 기록) ----
  const press = (sides) => {
    const fresh = sides.filter((sd) => !heldRef.current[sd]);
    if (!fresh.length) return;
    const t = Math.round(clockRef.current);
    const isRec = rec && phase === "running";
    const next = { ...heldRef.current };
    let list = clipsRef.current;
    if (isRec) pushHistory();
    fresh.forEach((side) => {
      const h = { color: cur.color, type: cur.type, k: cur.v, rec: isRec, clipId: null };
      if (isRec) {
        const nc = normClip({ side, start: t, end: t + MIN_CLIP, color: cur.color, type: cur.type, keys: cur.v < 1 ? [{ t, v: cur.v }] : [] });
        h.clipId = nc.id;
        list = overwrite(list, nc);
      }
      next[side] = h;
    });
    heldRef.current = next;
    setHeld(next);
    if (isRec) setClips(list);
  };
  const release = (sides) => {
    if (!sides.some((sd) => heldRef.current[sd])) return;
    const next = { ...heldRef.current };
    const t = Math.round(clockRef.current);
    let list = clipsRef.current;
    const done = [];
    sides.forEach((side) => {
      const h = next[side];
      if (!h) return;
      delete next[side];
      if (h.clipId) {
        list = list.map((c) => (c.id === h.clipId ? { ...c, end: Math.max(t, c.start + MIN_CLIP) } : c));
        done.push(h.clipId);
      }
    });
    heldRef.current = next;
    setHeld(next);
    if (done.length) {
      done.forEach((id) => {
        const c = list.find((x) => x.id === id);
        if (c) list = overwrite(list, c);
      });
      setClips(list);
    }
  };
  const releaseAll = () => release(Object.keys(heldRef.current));

  const applyLight = (patch) => {
    const next = { ...cur, ...patch };
    setCur(next);
    const sides = Object.keys(heldRef.current);
    if (!sides.length) return;
    const t = Math.round(clockRef.current);
    const hs = { ...heldRef.current };
    let list = clipsRef.current;
    let changed = false;
    const styleChanged = patch.color !== undefined || patch.type !== undefined;
    sides.forEach((side) => {
      const h = hs[side];
      hs[side] = { ...h, color: next.color, type: next.type, k: next.v };
      if (!h.clipId) return;
      const base = list.find((c) => c.id === h.clipId);
      if (!base) return;
      if (styleChanged && (next.color !== base.color || next.type !== base.type)) {
        const nc = normClip({ side, start: t, end: t + MIN_CLIP, color: next.color, type: next.type, keys: next.v < 1 ? [{ t, v: next.v }] : [] });
        list = overwrite(list.map((c) => (c.id === base.id ? { ...c, end: Math.max(t, c.start + MIN_CLIP) } : c)), nc);
        hs[side].clipId = nc.id;
        changed = true;
      } else if (patch.v !== undefined) {
        const keys = base.keys.length ? base.keys : [{ id: uid(), t: base.start, v: 1 }];
        const nk = [...keys.filter((k) => k.t !== t), { id: uid(), t, v: next.v }].sort((a, b) => a.t - b.t);
        list = list.map((c) => (c.id === base.id ? { ...c, keys: nk } : c));
        changed = true;
      }
    });
    heldRef.current = hs;
    setHeld(hs);
    if (changed) setClips(list);
  };

  // ---- 타임라인 보기: 확대 / 이동 바 ----
  const lastEnd = clips.reduce((m, c) => Math.max(m, c.end), 0);
  const lyricEnd = timings ? timings[timings.length - 1] : 0;
  const dur = Math.max(30000, Math.ceil((Math.max(lastEnd, lyricEnd, clock) + 8000) / 10000) * 10000);
  const canvasW = (dur / 1000) * pps;
  const syncView = () => {
    const sc = scrollRef.current;
    if (!sc) return;
    setView((v) => (v.sl === sc.scrollLeft && v.cw === sc.clientWidth ? v : { sl: sc.scrollLeft, cw: sc.clientWidth }));
  };
  const applyZoom = (n, leftFn) => {
    const sc = scrollRef.current;
    ppsRef.current = n;
    setPps(n);
    if (!sc) return;
    requestAnimationFrame(() => {
      sc.scrollLeft = Math.max(0, leftFn());
      syncView();
    });
  };
  const zoomTo = (next, anchorX) => {
    const sc = scrollRef.current;
    const old = ppsRef.current;
    const n = Math.min(400, Math.max(4, next));
    if (!sc) { ppsRef.current = n; setPps(n); return; }
    const rect = sc.getBoundingClientRect();
    const ax = anchorX == null ? rect.left + sc.clientWidth / 2 : anchorX;
    const secAt = (sc.scrollLeft + (ax - rect.left)) / old;
    applyZoom(n, () => secAt * n - (ax - rect.left));
  };
  const fit = () => {
    const sc = scrollRef.current;
    if (sc) zoomTo((sc.clientWidth - 12) / (dur / 1000));
  };
  useEffect(() => {
    const id = requestAnimationFrame(() => fit());
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    syncView();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncView) : null;
    if (ro) ro.observe(sc);
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
      e.preventDefault();
      zoomTo(ppsRef.current * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX);
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      sc.removeEventListener("wheel", onWheel);
      if (ro) ro.disconnect();
    };
  }, []);
  useEffect(() => { syncView(); }, [pps, dur]);
  useEffect(() => {
    if (phase !== "running") return;
    const sc = scrollRef.current;
    if (!sc) return;
    const x = (clock / 1000) * ppsRef.current;
    if (x < sc.scrollLeft + 10 || x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.2);
  }, [clock, phase]);

  // 이동 바: 가운데를 끌면 타임라인이 좌우로 움직이고, 양끝을 끌면 확대/축소
  const startNav = (e, mode) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const sc = scrollRef.current;
    const nav = navRef.current;
    if (!sc || !nav) return;
    const W = (dur / 1000) * ppsRef.current;
    const ratio = W / nav.getBoundingClientRect().width;
    const x0 = e.clientX;
    const sl0 = sc.scrollLeft;
    const cw = sc.clientWidth;
    const pps0 = ppsRef.current;
    const move = (ev) => {
      const dx = (ev.clientX - x0) * ratio;
      if (mode === "pan") {
        sc.scrollLeft = Math.min(Math.max(0, W - cw), Math.max(0, sl0 + dx));
        return;
      }
      const tLeft = sl0 / pps0;
      const tRight = (sl0 + cw) / pps0;
      const vis = Math.max(60, mode === "r" ? cw + dx : cw - dx);
      const n = Math.min(400, Math.max(4, (pps0 * cw) / vis));
      applyZoom(n, mode === "r" ? () => tLeft * n : () => tRight * n - cw);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const navTrackDown = (e) => {
    if (e.button !== 0) return;
    const sc = scrollRef.current;
    const nav = navRef.current;
    if (!sc || !nav) return;
    const r = nav.getBoundingClientRect();
    const W = (dur / 1000) * ppsRef.current;
    sc.scrollLeft = Math.max(0, ((e.clientX - r.left) / r.width) * W - sc.clientWidth / 2);
    startNav(e, "pan");
  };
  // 손 도구 / 마우스 휠 버튼: 타임라인을 잡고 끌어서 이동
  const startPan = (e) => {
    e.preventDefault();
    const sc = scrollRef.current;
    if (!sc) return;
    const x0 = e.clientX;
    const s0 = sc.scrollLeft;
    const move = (ev) => { sc.scrollLeft = s0 - (ev.clientX - x0); };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const snapT = (t, exId) => {
    let best = Math.round(t / 10) * 10;
    if (snapRef.current) {
      const th = (8 / ppsRef.current) * 1000;
      let bd = th;
      [0, clockRef.current, ...clipsRef.current.filter((c) => c.id !== exId).flatMap((c) => [c.start, c.end])].forEach((c) => {
        const d = Math.abs(c - t);
        if (d < bd) { bd = d; best = c; }
      });
    }
    return Math.max(0, best);
  };

  // ---- 마우스 편집: 이동(여러 개 함께) / 양끝 줄이고 늘리기 / 키프레임 / 자르기 도구 ----
  const startDrag = (e, kind, clipId, keyId) => {
    if (e.button === 1) { startPan(e); return; }
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (tool === "hand" && kind !== "key") { startPan(e); return; }
    const base = clipsRef.current;
    const orig = base.find((c) => c.id === clipId);
    if (!orig) return;
    if (tool === "razor" && kind === "move") {
      const r = canvasRef.current.getBoundingClientRect();
      const t = snapT(((e.clientX - r.left) / ppsRef.current) * 1000, clipId);
      const list = splitClip(base, clipId, t);
      if (list !== base) commit(list);
      return;
    }
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const wasSel = selIds.includes(clipId);
    let ids = wasSel ? selIds : additive ? [...selIds, clipId] : [clipId];
    if (kind !== "move") ids = [clipId];
    setSelIds(ids);
    setSelKeyId(kind === "key" ? keyId : null);
    const idSet = new Set(ids);
    const group = base.filter((c) => idSet.has(c.id));
    const others = base.filter((c) => !idSet.has(c.id));
    const x0 = e.clientX;
    const y0 = e.clientY;
    const lanesTop = canvasRef.current ? canvasRef.current.getBoundingClientRect().top + RULER_H : 0;
    let pushed = false;
    const onMove = (ev) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!pushed && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!pushed) { pushHistory(); pushed = true; }
      const dt = (dx / ppsRef.current) * 1000;
      let next = base;
      if (kind === "move") {
        const dS = snapT(orig.start + dt, clipId) - orig.start;
        const dE = snapT(orig.end + dt, clipId) - orig.end;
        let d = Math.abs(dS - dt) <= Math.abs(dE - dt) ? dS : dE;
        let side = orig.side;
        if (group.length === 1) {
          const laneIdx = Math.min(3, Math.max(0, Math.floor((ev.clientY - lanesTop) / (LANE_H + LANE_GAP))));
          const wantSide = LIGHT_SIDES[laneIdx].id;
          if (wantSide !== orig.side) {
            const s2 = orig.start + d;
            const e2 = orig.end + d;
            if (s2 >= 0 && !others.some((c) => c.side === wantSide && c.start < e2 && c.end > s2)) side = wantSide;
          }
        }
        if (side === orig.side) {
          let lo = -Infinity;
          let hi = Infinity;
          group.forEach((g) => {
            const l = limits(others, g.side, g);
            lo = Math.max(lo, l.lo);
            hi = Math.min(hi, l.hi);
          });
          d = Math.min(hi, Math.max(lo, d));
        }
        d = Math.max(d, -Math.min(...group.map((g) => g.start)));
        next = base.map((c) =>
          idSet.has(c.id)
            ? { ...c, side: c.id === clipId ? side : c.side, start: c.start + d, end: c.end + d, keys: c.keys.map((k) => ({ ...k, t: k.t + d })) }
            : c
        );
      } else if (kind === "trimL") {
        const { lo } = limits(others, orig.side, orig);
        const minS = isFinite(lo) ? orig.start + lo : 0;
        const s = Math.min(orig.end - MIN_CLIP, Math.max(minS, snapT(orig.start + dt, clipId)));
        next = base.map((c) => (c.id === clipId ? { ...c, start: s } : c));
      } else if (kind === "trimR") {
        const { hi } = limits(others, orig.side, orig);
        const maxE = isFinite(hi) ? orig.end + hi : Infinity;
        const en = Math.max(orig.start + MIN_CLIP, Math.min(maxE, snapT(orig.end + dt, clipId)));
        next = base.map((c) => (c.id === clipId ? { ...c, end: en } : c));
      } else if (kind === "key") {
        const k0 = orig.keys.find((k) => k.id === keyId);
        if (!k0) return;
        const t = Math.min(orig.end, Math.max(orig.start, Math.round((k0.t + dt) / 10) * 10));
        const v = Math.min(1, Math.max(0, Math.round((k0.v - dy / CLIP_H) * 100) / 100));
        next = base.map((c) =>
          c.id === clipId ? { ...c, keys: orig.keys.map((k) => (k.id === keyId ? { ...k, t, v } : k)).sort((a, b) => a.t - b.t) } : c
        );
      }
      setClips(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // Shift/Ctrl+클릭(끌지 않음)으로 이미 선택된 구간을 누르면 선택에서 뺀다
      if (!pushed && kind === "move" && additive && wasSel) setSelIds(selIds.filter((id) => id !== clipId));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // 빈 곳: 클릭하면 재생헤드 이동, 끌면 드래그 선택(마키)
  const startLane = (e) => {
    if (e.button === 1 || tool === "hand") { startPan(e); return; }
    if (e.button !== 0) return;
    const c0 = canvasRef.current.getBoundingClientRect();
    const x0 = e.clientX - c0.left;
    const y0 = e.clientY - c0.top;
    const additive = e.shiftKey;
    const baseIds = additive ? selIds : [];
    let dragging = false;
    const onMove = (ev) => {
      const r = canvasRef.current.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      if (!dragging && Math.abs(x - x0) + Math.abs(y - y0) < 4) return;
      dragging = true;
      const m = { x1: Math.min(x0, x), x2: Math.max(x0, x), y1: Math.min(y0, y), y2: Math.max(y0, y) };
      setMarquee(m);
      const hit = clipsRef.current
        .filter((c) => {
          const li = LIGHT_SIDES.findIndex((s) => s.id === c.side);
          const top = RULER_H + LANE_GAP + li * (LANE_H + LANE_GAP) + 6;
          const l = (c.start / 1000) * ppsRef.current;
          const rr = (c.end / 1000) * ppsRef.current;
          return rr > m.x1 && l < m.x2 && top + CLIP_H > m.y1 && top < m.y2;
        })
        .map((c) => c.id);
      setSelIds([...new Set([...baseIds, ...hit])]);
      setSelKeyId(null);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setMarquee(null);
      if (!dragging) {
        seekTo((x0 / ppsRef.current) * 1000);
        if (!additive) setSelIds([]);
        setSelKeyId(null);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 눈금자: 누르고 끌면 재생헤드가 따라온다
  const startScrub = (e) => {
    if (e.button === 1 || tool === "hand") { startPan(e); return; }
    if (e.button !== 0) return;
    const to = (ev) => {
      const r = canvasRef.current.getBoundingClientRect();
      seekTo(((ev.clientX - r.left) / ppsRef.current) * 1000);
    };
    to(e);
    const up = () => {
      window.removeEventListener("pointermove", to);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", to);
    window.addEventListener("pointerup", up);
  };

  const addKey = (e, clip) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.round(clip.start + ((e.clientX - r.left) / r.width) * (clip.end - clip.start));
    const v = Math.round(Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)) * 100) / 100;
    const keys = clip.keys.length ? clip.keys : [{ id: uid(), t: clip.start, v: 1 }, { id: uid(), t: clip.end, v: 1 }];
    const nk = { id: uid(), t, v };
    commit(clipsRef.current.map((c) => (c.id === clip.id ? { ...c, keys: [...keys, nk].sort((a, b) => a.t - b.t) } : c)));
    setSelIds([clip.id]);
    setSelKeyId(nk.id);
  };

  // ---- 편집 동작 (단축키·버튼 공용) ----
  const editSel = (fn) => commit(clipsRef.current.map((c) => (selSet.has(c.id) ? fn(c) : c)));
  const deleteSel = () => {
    if (selClip && selKeyId) {
      commit(clipsRef.current.map((c) => (c.id === selClip.id ? { ...c, keys: c.keys.filter((k) => k.id !== selKeyId) } : c)));
      setSelKeyId(null);
    } else if (selIds.length) {
      commit(clipsRef.current.filter((c) => !selSet.has(c.id)));
      setSelIds([]);
    }
  };
  const rippleSel = () => {
    if (!selIds.length) return;
    let list = clipsRef.current;
    [...clipsRef.current.filter((c) => selSet.has(c.id))].sort((a, b) => b.start - a.start).forEach((c) => { list = rippleDelete(list, c.id); });
    commit(list);
    setSelIds([]);
  };
  const splitAtPlayhead = () => {
    const t = Math.round(clockRef.current);
    const ids = selIds.length ? selIds : clipsRef.current.filter((c) => c.start < t && t < c.end).map((c) => c.id);
    let list = clipsRef.current;
    ids.forEach((id) => { list = splitClip(list, id, t); });
    if (list !== clipsRef.current) commit(list);
  };
  const copySel = () => {
    const g = clipsRef.current.filter((c) => selSet.has(c.id));
    if (g.length) clipboardRef.current = g;
  };
  const pasteAtPlayhead = () => {
    const src = clipboardRef.current;
    if (!src || !src.length) return;
    const t0 = Math.round(clockRef.current);
    const m = Math.min(...src.map((c) => c.start));
    let list = clipsRef.current;
    const made = src.map((c) => normClip({ ...c, id: uid(), start: c.start - m + t0, end: c.end - m + t0, keys: c.keys.map((k) => ({ ...k, id: uid(), t: k.t - m + t0 })) }));
    made.forEach((nc) => { list = overwrite(list, nc); });
    commit(list);
    setSelIds(made.map((c) => c.id));
  };
  const jumpEdit = (dir) => {
    const pts = [...new Set(clipsRef.current.flatMap((c) => [c.start, c.end]))].sort((a, b) => a - b);
    const t = clockRef.current;
    const target = dir > 0 ? pts.find((p) => p > t + 1) : [...pts].reverse().find((p) => p < t - 1);
    seekTo(target == null ? (dir > 0 ? pts[pts.length - 1] || 0 : 0) : target);
  };
  const setFade = (kind) => {
    editSel((c) => {
      const len = Math.min(500, (c.end - c.start) / 2);
      const keys =
        kind === "in"
          ? [{ id: uid(), t: c.start, v: 0 }, { id: uid(), t: c.start + len, v: 1 }, ...c.keys.filter((k) => k.t > c.start + len)]
          : [...c.keys.filter((k) => k.t < c.end - len), { id: uid(), t: c.end - len, v: 1 }, { id: uid(), t: c.end, v: 0 }];
      return { ...c, keys: keys.sort((a, b) => a.t - b.t) };
    });
  };
  const commitTime = (which, valSec) => {
    if (!selClip) return;
    const v = Math.round(Number(valSec) * 1000);
    if (!isFinite(v)) return;
    const others = clipsRef.current.filter((c) => c.id !== selClip.id);
    const { lo, hi } = limits(others, selClip.side, selClip);
    if (which === "start") {
      const minS = isFinite(lo) ? selClip.start + lo : 0;
      commit(clipsRef.current.map((c) => (c.id === selClip.id ? { ...c, start: Math.min(c.end - MIN_CLIP, Math.max(minS, v)) } : c)));
    } else {
      const maxE = isFinite(hi) ? selClip.end + hi : Infinity;
      commit(clipsRef.current.map((c) => (c.id === selClip.id ? { ...c, end: Math.max(c.start + MIN_CLIP, Math.min(maxE, v)) } : c)));
    }
  };
  const toggleMute = (side) => setCfg({ muted: { ...muted, [side]: !muted[side] } });

  // ---- 키보드 (프리미어 단축키 일부 포함) ----
  useEffect(() => {
    const HOLD = { ArrowLeft: ["left"], ArrowRight: ["right"], ArrowUp: ["top"], ArrowDown: ["bottom"], a: ALL_SIDES, A: ALL_SIDES };
    const typing = (e) => {
      const t = e.target;
      const tag = ((t && t.tagName) || "").toLowerCase();
      return tag === "textarea" || (tag === "input" && ["text", "search", "number"].includes(t.type));
    };
    const onDown = (e) => {
      if (typing(e)) return;
      const k = e.key;
      const lower = k.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (lower === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (lower === "y") { e.preventDefault(); redo(); }
        else if (lower === "k") { e.preventDefault(); splitAtPlayhead(); }
        else if (lower === "c") { copySel(); }
        else if (lower === "v") { pasteAtPlayhead(); }
        return;
      }
      if (e.altKey) return;
      if (k === "Escape") { close(); return; }
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        if (phase === "ready") begin();
        else if (phase === "running") pause();
        else if (phase === "paused") resume();
        return;
      }
      const dm = /^Digit(\d)$/.exec(e.code || "");
      if (dm && e.shiftKey) {
        e.preventDefault();
        if (!e.repeat) assignSlot(dm[1] === "0" ? 9 : Number(dm[1]) - 1);
        return;
      }
      if (e.shiftKey && (k === "ArrowLeft" || k === "ArrowRight")) { e.preventDefault(); seekTo(clockRef.current + (k === "ArrowLeft" ? -500 : 500)); return; }
      if (e.shiftKey && (k === "ArrowUp" || k === "ArrowDown")) { e.preventDefault(); jumpEdit(k === "ArrowDown" ? 1 : -1); return; }
      const hold = HOLD[k];
      if (hold && !e.shiftKey) { e.preventDefault(); if (!e.repeat) press(hold); return; }
      if (k === "Delete" || k === "Backspace") { e.preventDefault(); if (e.shiftKey) rippleSel(); else deleteSel(); return; }
      if (k === "Home") { seekTo(0); return; }
      if (k === "End") { seekTo(lastEnd); return; }
      if (k === "=" || k === "+") { zoomTo(ppsRef.current * 1.3); return; }
      if (k === "-" || k === "_") { zoomTo(ppsRef.current / 1.3); return; }
      if (k === "\\") { fit(); return; }
      if (e.repeat) return;
      if (lower === "v") { setTool("select"); return; }
      if (lower === "c") { setTool("razor"); return; }
      if (lower === "h") { setTool("hand"); return; }
      if (lower === "r") { setRec((r) => !r); return; }
      if (lower === "s") { setSnapOn((v) => !v); return; }
      if (k === "[") { applyLight({ v: Math.max(0, Math.round((cur.v - 0.1) * 10) / 10) }); return; }
      if (k === "]") { applyLight({ v: Math.min(1, Math.round((cur.v + 0.1) * 10) / 10) }); return; }
      const di = "1234567890".indexOf(k);
      if (di >= 0) { applyLight({ color: slots[di] }); return; }
      const tp = { q: "solid", w: "breathe", e: "strobe" }[lower];
      if (tp) applyLight({ type: tp });
    };
    const onUp = (e) => {
      if (e.code === "Space") e.preventDefault();
      const hold = HOLD[e.key];
      if (hold) release(hold);
    };
    const onBlur = () => releaseAll();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  // ---- 화면에 보일 값 ----
  const shown = { ...applyMute(lightsFromClips(clips, clock), muted), ...held };
  let caption = [];
  if (timings) {
    let k = -1;
    for (let i = 0; i < timings.length; i++) {
      if (timings[i] <= clock) k = i;
      else break;
    }
    if (k >= 0) caption = groups[k].map((li) => lines[li].trim());
  }
  const stepMs = [100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000].find((s) => (s / 1000) * pps >= 70) || 60000;
  const ticks = [];
  for (let t = 0; t <= dur; t += stepMs) ticks.push(t);
  const sideLabel = (id) => (LIGHT_SIDES.find((s) => s.id === id) || {}).label;
  const navW = Math.max(1, canvasW);
  const thumbL = Math.min(100, (view.sl / navW) * 100);
  const thumbW = Math.min(100 - thumbL, Math.max(3, (view.cw / navW) * 100));

  return (
    <div
      className="ls-root"
      onPointerUp={(e) => {
        const b = e.target && e.target.closest ? e.target.closest("button") : null;
        if (b) b.blur();
      }}
    >
      <div className="ls-head">
        <button className="icon-btn" onClick={close} aria-label="닫기">
          <X size={19} />
        </button>
        <div className="ls-title">라이트 설정 · {song.title || "제목 없음"}</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="ls-work">
        {/* 왼쪽: 색·종류 (소스 패널) */}
        <section className="ls-panel">
          <div className="ls-ph">색 · 종류</div>
          <div className="ls-pb">
            <div>
              <div className="ls-label">종류</div>
              <div className="ls-seg3">
                {[["solid", "고정", "Q"], ["breathe", "숨쉬기", "W"], ["strobe", "스트로브", "E"]].map(([id, label, key]) => (
                  <button key={id} className={cur.type === id ? "on" : ""} onClick={() => applyLight({ type: id })}>
                    {label}<kbd>{key}</kbd>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="ls-label">번호 키 색<span className="ls-cur" style={{ background: cur.color }} /></div>
              <div className="ls-quick">
                {slots.map((c, i) => (
                  <button
                    key={i}
                    className={`ls-sw${cur.color === c ? " on" : ""}`}
                    style={{ background: c }}
                    onClick={(e) => (e.shiftKey ? assignSlot(i) : applyLight({ color: c }))}
                    aria-label={`번호 ${i === 9 ? 0 : i + 1}`}
                  >
                    <kbd>{i === 9 ? 0 : i + 1}</kbd>
                  </button>
                ))}
              </div>
              <div className="ls-slotbar">
                <span>Shift+클릭 · Shift+숫자 = 현재 색을 그 번호에 저장</span>
                <button className="ls-mini" onClick={resetSlots}>초기화</button>
              </div>
            </div>

            <div>
              <div className="ls-label">팔레트</div>
              <div className="ls-pal">
                {PALETTE.map((c) => (
                  <button key={c} className={`ls-sw sm${cur.color === c ? " on" : ""}`} style={{ background: c }} onClick={() => applyLight({ color: c })} aria-label="색" />
                ))}
              </div>
            </div>

            <div>
              <div className="ls-label">직접 고르기</div>
              <ColorPicker value={cur.color} onChange={(c) => applyLight({ color: c })} />
            </div>

            <div>
              <div className="ls-label">조명 밝기<span className="ls-val">{Math.round(cur.v * 100)}% · [ ]</span></div>
              <input className="ls-range" type="range" min="0" max="1" step="0.05" value={cur.v} onChange={(e) => applyLight({ v: Number(e.target.value) })} />
              <div className="ls-hintline">녹화 중 방향을 누른 채 움직이면 밝기가 키프레임으로 기록돼요</div>
            </div>
          </div>
        </section>

        {/* 가운데: 프로그램 모니터 */}
        <section className="ls-panel ls-mon">
          <div className="ls-ph">프로그램</div>
          <div className="ls-mon-body">
            <div className="ls-stage">
              <LightRig state={shown} cfg={cfg} />
              {LIGHT_SIDES.map((sd) => (
                <div
                  key={sd.id}
                  className={`ls-zone z-${sd.id}${held[sd.id] ? " on" : ""}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
                    press([sd.id]);
                  }}
                  onPointerUp={() => release([sd.id])}
                  onPointerCancel={() => release([sd.id])}
                />
              ))}
              {LIGHT_SIDES.map((sd) => (
                <span key={sd.id} className={`ls-hint h-${sd.id}`}>{sd.key}</span>
              ))}
              {caption.length > 0 && (
                <div className="ls-caption">
                  {caption.map((t, i) => (
                    <div key={i}>{t}</div>
                  ))}
                </div>
              )}
              {phase === "count" && count > 0 && (
                <div className="ls-count"><span key={count}>{count}</span></div>
              )}
            </div>
          </div>
          <div className="ls-transport">
            {phase === "running" ? (
              <button className="pill-btn" onClick={pause}><Pause size={15} fill="currentColor" /><span>정지</span></button>
            ) : (
              <button className="pill-btn" onClick={phase === "paused" ? resume : begin}>
                <Play size={15} fill="currentColor" /><span>시작</span>
              </button>
            )}
            <button className="icon-btn" onClick={restart} aria-label="처음으로"><RotateCcw size={17} /></button>
            <div className="ls-clock">{fmtMs(clock)}</div>
            <button className={`ls-chip rec${rec ? " on" : ""}`} onClick={() => setRec(!rec)}>
              <span className="ls-dot" />{rec ? "녹화 중" : "녹화"}<kbd>R</kbd>
            </button>
          </div>
        </section>

        {/* 오른쪽: 효과 컨트롤 */}
        <section className="ls-panel">
          <div className="ls-ph">효과 컨트롤</div>
          <div className="ls-pb">
            {selClip ? (
              <div className="ls-insp">
                <div className="ls-insp-title">
                  <span className="ls-cur" style={{ background: selClip.color }} />
                  {selIds.length > 1 ? `${selIds.length}개 선택` : `${sideLabel(selClip.side)} · ${TYPE_NAMES[selClip.type]}`}
                </div>
                {selIds.length === 1 && (
                  <div className="ls-nums">
                    <label className="ls-numl">시작
                      <input key={"s" + selClip.id + selClip.start} className="ls-num" type="number" step="0.1" min="0" defaultValue={(selClip.start / 1000).toFixed(2)}
                        onBlur={(e) => commitTime("start", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                    </label>
                    <label className="ls-numl">끝
                      <input key={"e" + selClip.id + selClip.end} className="ls-num" type="number" step="0.1" min="0" defaultValue={(selClip.end / 1000).toFixed(2)}
                        onBlur={(e) => commitTime("end", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                    </label>
                  </div>
                )}
                <div className="ls-btnrow">
                  <button className="ls-mini" onClick={() => editSel((c) => ({ ...c, color: cur.color, type: cur.type }))}>현재 색·종류 적용</button>
                  <button className="ls-mini" onClick={() => setFade("in")}>페이드 인</button>
                  <button className="ls-mini" onClick={() => setFade("out")}>페이드 아웃</button>
                  <button className="ls-mini" onClick={() => editSel((c) => ({ ...c, keys: [] }))}>밝기 초기화</button>
                  <button className="ls-mini" onClick={splitAtPlayhead}>자르기<kbd>Ctrl K</kbd></button>
                  <button className="ls-mini danger" onClick={deleteSel}>삭제</button>
                </div>
                <div className="ls-hintline">구간을 더블클릭하면 밝기 키프레임이 생겨요</div>
              </div>
            ) : (
              <div className="ls-hintline big">
                {clips.length === 0 ? "R로 녹화를 켜고 시작한 뒤, 방향키를 누르고 있으세요" : "타임라인에서 구간을 고르면 여기서 수정해요"}
              </div>
            )}

            <div>
              <div className="ls-label">범위<span className="ls-val">{cfg.depth}</span></div>
              <input className="ls-range" type="range" min="1" max="80" step="1" value={cfg.depth} onChange={(e) => setCfg({ depth: Number(e.target.value) })} />
              <div className="ls-label">전체 밝기<span className="ls-val">{Math.round(cfg.power * 100)}%</span></div>
              <input className="ls-range" type="range" min="0.2" max="1" step="0.05" value={cfg.power} onChange={(e) => setCfg({ power: Number(e.target.value) })} />
            </div>
          </div>
        </section>
      </div>

      {/* 타임라인 */}
      <section className="ls-panel ls-timeline" data-tool={tool}>
        <div className="ls-ph">타임라인</div>
        <div className="ls-tools">
          {[["select", "선택 (V)", MousePointer2], ["razor", "자르기 도구 (C)", Scissors], ["hand", "손 (H)", Hand]].map(([id, label, Icon]) => (
            <button key={id} className={`ls-tool${tool === id ? " on" : ""}`} onClick={() => setTool(id)} title={label} aria-label={label}>
              <Icon size={16} />
            </button>
          ))}
          <span className="ls-vsep" />
          <button className="ls-tool" onClick={undo} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기"><Undo2 size={16} /></button>
          <button className="ls-tool" onClick={redo} title="다시 (Ctrl+Y)" aria-label="다시"><Redo2 size={16} /></button>
          <span className="ls-vsep" />
          <button className={`ls-tool txt${snapOn ? " on" : ""}`} onClick={() => setSnapOn(!snapOn)} title="스냅 (S)">스냅</button>
          <span className="ls-sp" />
          <button className="ls-tool" onClick={() => zoomTo(ppsRef.current / 1.3)} title="축소 (-)" aria-label="축소"><Minus size={16} /></button>
          <input className="ls-zoom" type="range" min="0" max="100" step="1" value={Math.max(0, Math.min(100, ppsToSlider(pps)))} onChange={(e) => zoomTo(sliderToPps(Number(e.target.value)))} aria-label="확대" />
          <button className="ls-tool" onClick={() => zoomTo(ppsRef.current * 1.3)} title="확대 (=)" aria-label="확대"><Plus size={16} /></button>
          <button className="ls-tool txt" onClick={fit} title="맞춤 (\)">맞춤</button>
        </div>

        <div className="ls-tl-main">
          <div className="ls-labels">
            {LIGHT_SIDES.map((sd) => (
              <div key={sd.id} className="ls-th">
                <button className={`ls-eye${muted[sd.id] ? " off" : ""}`} onClick={() => toggleMute(sd.id)} title="이 방향 조명 켜기/끄기" aria-label={`${sd.label} 켜기/끄기`}>
                  {muted[sd.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <span>{sd.label}</span>
              </div>
            ))}
          </div>
          <div className="ls-tl-right">
            <div className="ls-scroll" ref={scrollRef} onScroll={syncView}>
              <div className="ls-canvas" ref={canvasRef} style={{ width: canvasW }}>
                <div className="ls-ruler" onPointerDown={startScrub}>
                  {ticks.map((t) => (
                    <span key={t} className="ls-tick" style={{ left: (t / 1000) * pps }}>{fmtMs(t).replace(/\.0$/, "")}</span>
                  ))}
                </div>
                {LIGHT_SIDES.map((sd) => (
                  <div key={sd.id} className={`ls-lane${muted[sd.id] ? " muted" : ""}`} onPointerDown={startLane}>
                    {clips.filter((c) => c.side === sd.id).map((c) => {
                      const w = Math.max(3, ((c.end - c.start) / 1000) * pps);
                      const sel = selSet.has(c.id);
                      return (
                        <div
                          key={c.id}
                          className={`ls-clip t-${c.type}${sel ? " sel" : ""}`}
                          style={{ left: (c.start / 1000) * pps, width: w, background: c.color }}
                          onPointerDown={(e) => startDrag(e, "move", c.id)}
                          onDoubleClick={(e) => addKey(e, c)}
                        >
                          {w > 24 && (
                            <KeyCurve clip={c} w={w} h={CLIP_H} selected={sel && selIds.length === 1} selKeyId={selKeyId} onKeyDown={(e, k) => startDrag(e, "key", c.id, k.id)} />
                          )}
                          <div className="ls-edge l" onPointerDown={(e) => startDrag(e, "trimL", c.id)} />
                          <div className="ls-edge r" onPointerDown={(e) => startDrag(e, "trimR", c.id)} />
                        </div>
                      );
                    })}
                  </div>
                ))}
                {marquee && (
                  <div className="ls-marquee" style={{ left: marquee.x1, top: marquee.y1, width: marquee.x2 - marquee.x1, height: marquee.y2 - marquee.y1 }} />
                )}
                <div className="ls-playhead" style={{ left: (clock / 1000) * pps }} />
              </div>
            </div>
            <div className="ls-nav" ref={navRef} onPointerDown={navTrackDown}>
              <div className="ls-thumb" style={{ left: `${thumbL}%`, width: `${thumbW}%` }} onPointerDown={(e) => startNav(e, "pan")} title="끌어서 타임라인 이동">
                <i className="h l" onPointerDown={(e) => startNav(e, "l")} />
                <i className="h r" onPointerDown={(e) => startNav(e, "r")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ls-help">
        <span><kbd>← → ↑ ↓</kbd> 누르는 동안 켜짐</span>
        <span><kbd>A</kbd> 전체</span>
        <span><kbd>1–0</kbd> 색 · <kbd>Shift 1–0</kbd> 번호에 저장</span>
        <span><kbd>Q W E</kbd> 종류</span>
        <span><kbd>[ ]</kbd> 밝기</span>
        <span><kbd>Space</kbd> 시작/정지</span>
        <span><kbd>V</kbd> 선택 <kbd>C</kbd> 자르기 <kbd>H</kbd> 손</span>
        <span><kbd>Ctrl K</kbd> 재생 위치에서 자르기</span>
        <span><kbd>Del</kbd> 삭제 · <kbd>Shift Del</kbd> 당겨 삭제</span>
        <span><kbd>Shift ←→</kbd> 0.5초 · <kbd>Shift ↑↓</kbd> 편집점</span>
        <span><kbd>Home</kbd><kbd>End</kbd></span>
        <span><kbd>= −</kbd> 확대/축소 · <kbd>\</kbd> 맞춤</span>
        <span><kbd>Ctrl Z</kbd><kbd>Ctrl Y</kbd> · <kbd>Ctrl C</kbd><kbd>Ctrl V</kbd></span>
      </div>
    </div>
  );
}

/* ---------- 싱크 플레이어 (녹화 / 재생 / 큰 글씨 보기) ---------- */
function SyncPlayer({ song, mode, fontSize, onFont, onClose, onSaveTimings }) {
  const lines = useMemo(() => (song.lyrics || "").split("\n"), [song.lyrics]);
  const [gs, setGs] = useState(song.groupSize ?? (mode === "record" ? 0 : 1));
  const activeGs = mode === "record" ? gs : song.groupSize ?? 1;
  const groups = useMemo(() => getGroups(song.lyrics, activeGs), [song.lyrics, activeGs]);
  const kOfLine = useMemo(() => {
    const m = {};
    groups.forEach((g, k) => g.forEach((li) => { m[li] = k; }));
    return m;
  }, [groups]);
  const timings = song.timings;
  const hasTimings = !!timings && timings.length === groups.length;
  const effMode = mode === "record" ? "record" : mode === "play" ? "play" : "view";
  const canPick = effMode !== "view" && hasTimings;

  const [phase, setPhase] = useState("ready"); // ready | count | running | paused | done
  const [count, setCount] = useState(3);
  const [clock, setClock] = useState(0);
  const [activeK, setActiveK] = useState(-1);
  const [recLen, setRecLen] = useState(0);
  const [startK, setStartK] = useState(0); // 시작 위치(묶음 번호)
  const offsetRef = useRef(0);
  const baseRef = useRef(0);
  const startRef = useRef(0);
  const clockRef = useRef(0);
  const rafRef = useRef(0);
  const recRef = useRef([]);
  const scrollRef = useRef(null);
  const rootRef = useRef(null);
  // ----- 조명: 부르는 화면에서는 저장된 라이트를 재생만 한다 (편집은 라이트 설정 화면) -----
  const cuesRef = useRef(clipsFromSong(song));
  const [lightNow, setLightNow] = useState({});
  const lightKeyRef = useRef("");
  const [lightsOn, setLightsOn] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("lightsOn", false);
        if (r && r.value === "0") setLightsOn(false);
      } catch (e) {
        // 저장된 설정 없음
      }
    })();
  }, []);
  const toggleLights = () => {
    const next = !lightsOn;
    setLightsOn(next);
    try {
      window.storage.set("lightsOn", next ? "1" : "0", false).catch(() => {});
    } catch (e) {
      // 저장 실패는 무시
    }
  };
  useEffect(() => {
    const onKey = (e) => {
      const tag = ((e.target && e.target.tagName) || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "l" && !e.repeat) toggleLights();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useWakeLock(true);

  const close = () => onClose();

  // 녹화 중에는 실수로 닫히지 않게 잠그고, 그 외에는 위쪽 바나 맨 위에서 쓸어내려 닫을 수 있다
  const recordingLocked = effMode === "record" && (phase === "count" || phase === "running" || phase === "done");
  useSwipeDismiss(rootRef, {
    enabled: !recordingLocked,
    canStart: (t) => {
      if (!t || !t.closest) return false;
      if (t.closest(".sp-head")) return true;
      const sc = scrollRef.current;
      const idle = effMode === "view" || phase === "ready" || phase === "paused";
      return !!(idle && sc && sc.scrollTop <= 0 && t.closest(".sp-scroll"));
    },
    drag: (el, v, p) => {
      el.style.transform = `translateY(${v}px) scale(${1 - p * 0.05})`;
      el.style.borderRadius = `${Math.round(p * 32)}px`;
    },
    out: (el) => {
      el.style.transform = "translateY(100%)";
    },
    reset: (el) => {
      el.style.transform = "";
      el.style.borderRadius = "";
    },
    onDismiss: close,
  });

  // 3-2-1 카운트다운
  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) {
      startRef.current = performance.now() - offsetRef.current;
      clockRef.current = offsetRef.current;
      setClock(offsetRef.current);
      setPhase("running");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // 시계 루프
  useEffect(() => {
    if (phase !== "running") return;
    let last = -1000;
    const tick = () => {
      const now = performance.now() - startRef.current;
      clockRef.current = now;
      if (now - last > 100) {
        last = now;
        setClock(now);
      }
      if (effMode === "play" && hasTimings) {
        let k = -1;
        for (let i = 0; i < timings.length; i++) {
          if (timings[i] <= now) k = i;
          else break;
        }
        setActiveK(k);
      }
      const st = applyMute(lightsFromClips(cuesRef.current, now), song.lightCfg && song.lightCfg.muted);
      const lk = lightKey(st);
      if (lk !== lightKeyRef.current) {
        lightKeyRef.current = lk;
        setLightNow(st);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, effMode, timings, hasTimings]);

  // 활성 줄을 화면 중앙 쪽으로 부드럽게 스크롤
  useEffect(() => {
    if (effMode === "view" || activeK < 0) return;
    const g = groups[activeK];
    const sc = scrollRef.current;
    if (!g || !sc) return;
    const first = sc.querySelector(`[data-i="${g[0]}"]`);
    const last = sc.querySelector(`[data-i="${g[g.length - 1]}"]`);
    if (!first || !last) return;
    const mid = (first.offsetTop + last.offsetTop + last.offsetHeight) / 2;
    sc.scrollTo({ top: mid - sc.clientHeight * 0.36, behavior: "smooth" });
  }, [activeK, effMode, groups]);

  const begin = () => {
    const k = canPick ? startK : 0;
    offsetRef.current = k > 0 ? timings[k] : 0;
    baseRef.current = effMode === "record" ? k : 0;
    recRef.current = effMode === "record" && k > 0 ? timings.slice(0, k) : [];
    setRecLen(recRef.current.length);
    setActiveK(effMode === "record" ? k - 1 : -1);
    setCount(3);
    setPhase("count");
  };

  const handleTap = () => {
    if (effMode !== "record" || phase !== "running") return;
    if (recRef.current.length >= groups.length) return;
    recRef.current = [...recRef.current, Math.round(performance.now() - startRef.current)];
    haptic(10);
    setRecLen(recRef.current.length);
    setActiveK(recRef.current.length - 1);
    if (recRef.current.length === groups.length) {
      setClock(clockRef.current);
      setPhase("done");
    }
  };

  const undo = () => {
    if (recRef.current.length <= baseRef.current) return;
    recRef.current = recRef.current.slice(0, -1);
    setRecLen(recRef.current.length);
    setActiveK(recRef.current.length - 1);
    if (phase === "done") {
      startRef.current = performance.now() - clockRef.current;
      setPhase("running");
    }
  };

  const restart = () => {
    cancelAnimationFrame(rafRef.current);
    recRef.current = [];
    setRecLen(0);
    setActiveK(-1);
    setClock(0);
    clockRef.current = 0;
    setPhase("ready");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    lightKeyRef.current = "";
    setLightNow({});
  };

  const pause = () => {
    setClock(clockRef.current);
    setPhase("paused");
  };

  const resume = () => {
    startRef.current = performance.now() - clockRef.current;
    setPhase("running");
  };

  const seek = (k) => {
    if (phase === "ready" && canPick) {
      setStartK(k);
      return;
    }
    if (effMode !== "play" || !hasTimings || (phase !== "running" && phase !== "paused")) return;
    const t = timings[k];
    clockRef.current = t;
    startRef.current = performance.now() - t;
    setClock(t);
    setActiveK(k);
  };

  // 데스크톱 키보드: Space 시작·정지(가사 녹화 중에는 탭), Esc 닫기
  useEffect(() => {
    const onDown = (e) => {
      const tag = ((e.target && e.target.tagName) || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        if (effMode === "record") handleTap();
        else if (effMode === "play") {
          if (phase === "ready") begin();
          else if (phase === "running") pause();
          else if (phase === "paused") resume();
        }
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  });

  const syncOn =
    (effMode === "play" && hasTimings && (phase === "running" || phase === "paused")) ||
    (effMode === "record" && (phase === "running" || phase === "done"));
  const nextK = effMode === "record" ? recLen : activeK + 1;

  // 줄 목록은 시계(0.1초마다 갱신)와 무관하게 필요할 때만 다시 그린다
  const lineNodes = useMemo(
    () =>
      lines.map((l, i) => {
        if (!l.trim()) return <div key={i} className="sp-blank" />;
        const k = kOfLine[i];
        let cls = "sp-line";
        if (syncOn) {
          // 위 = 이미 지나간 가사, 아래 = 이제 나올 가사 (멀수록 옅게)
          const d = k - activeK;
          if (d === 0) cls += " active";
          else if (d > 0) cls += ` upcoming u${Math.min(d, 4)}`;
          else cls += ` past p${Math.min(-d, 4)}`;
        } else if (phase === "ready" && canPick && startK > 0 && k === startK) {
          cls += " start";
        }
        return (
          <p key={i} data-i={i} data-k={k} className={cls}>
            {l.trim()}
          </p>
        );
      }),
    [lines, kOfLine, syncOn, activeK, nextK, phase, canPick, startK]
  );

  const onLinesClick = (e) => {
    const p = e.target && e.target.closest ? e.target.closest("[data-k]") : null;
    if (p) seek(Number(p.dataset.k));
  };

  return (
    <div className="sp-root" ref={rootRef}>
      <div
        className={`sp-bg${song.cover ? "" : " plain"}`}
        style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
      />
      <LightRig state={lightsOn ? lightNow : {}} cfg={song.lightCfg} />

      <div className="sp-head">
        <button className="icon-btn" onClick={close} aria-label="닫기">
          <X size={19} />
        </button>
        <div className="sp-title">{song.title || "제목 없음"}</div>
        <div className="sp-font">
          {songHasLights(song) && (
            <button className={`icon-btn${lightsOn ? " on" : ""}`} onClick={toggleLights} aria-label="조명 켜기/끄기" title="조명 (L)">
              <Lightbulb size={17} />
            </button>
          )}
          <button className="icon-btn" onClick={() => onFont(-2)} aria-label="글자 작게">
            <Minus size={17} />
          </button>
          <button className="icon-btn" onClick={() => onFont(2)} aria-label="글자 크게">
            <Plus size={17} />
          </button>
        </div>
      </div>

      <div className="sp-body">
        <div ref={scrollRef} className={`sp-scroll${effMode === "view" ? "" : " pad-sync"}`}>
          <div className={`sp-lines${syncOn ? " sync" : ""}`} style={{ fontSize }} onClick={onLinesClick}>
            {lineNodes}
          </div>
        </div>
        <div className="sp-fade top" />
        <div className="sp-fade bot" />
      </div>

      {phase === "count" && count > 0 && (
        <div className="sp-count">
          <span key={count}>{count}</span>
        </div>
      )}

      {effMode !== "view" && phase !== "count" && (
        <div className="sp-controls">
          {phase === "ready" && canPick && (
            <div className="sp-next">{startK > 0 ? "여기부터 시작" : "시작할 곳을 탭"}</div>
          )}
          {effMode === "record" && phase === "ready" && (
            <div className="sp-seg">
              <span>넘김</span>
              {[[0, "문단"], [1, "한 줄"]].map(([n, label]) => (
                <button key={n} className={gs === n ? "on" : ""} onClick={() => { setGs(n); setStartK(0); }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {effMode === "record" && (phase === "running" || phase === "done") && nextK < groups.length && (
            <div className="sp-next">{lines[groups[nextK][0]]}</div>
          )}
          <div className="sp-dock">
            {phase === "ready" && (
              <button className="pill-btn" onClick={begin}>
                <Play size={15} fill="currentColor" />
                <span>{effMode === "record" ? "녹화" : "시작"}</span>
              </button>
            )}
            {phase === "ready" && canPick && startK > 0 && (
              <div className="sp-clock">{formatClock(timings[startK])}</div>
            )}

            {effMode === "play" && (phase === "running" || phase === "paused") && (
              <>
                <button className="sp-btn main" onClick={phase === "running" ? pause : resume} aria-label="재생/일시정지">
                  {phase === "running" ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button className="sp-btn" onClick={restart} aria-label="처음부터">
                  <RotateCcw size={18} />
                </button>
                <div className="sp-clock">{formatClock(clock)}</div>
              </>
            )}

            {effMode === "record" && phase === "running" && (
              <>
                <button className="sp-btn" onClick={undo} aria-label="되돌리기">
                  <Undo2 size={18} />
                </button>
                <button
                  className="sp-btn big main"
                  onPointerDown={(e) => { e.preventDefault(); handleTap(); }}
                  aria-label="탭"
                >
                  <span className="sp-tap-label">탭</span>
                </button>
                <div className="sp-clock">{formatClock(clock)}</div>
              </>
            )}

            {effMode === "record" && phase === "done" && (
              <>
                <button className="sp-btn" onClick={undo} aria-label="되돌리기">
                  <Undo2 size={18} />
                </button>
                <button className="pill-btn" onClick={() => onSaveTimings(recRef.current, gs)}>
                  <Check size={16} />
                  <span>저장</span>
                </button>
                <button className="sp-btn" onClick={restart} aria-label="다시">
                  <RotateCcw size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 백업 / 복원 ---------- */
function BackupModal({ songs, onClose, onImport, notify }) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);

  const makeJson = () =>
    JSON.stringify({ app: "lyrics-archive", version: 2, exportedAt: Date.now(), songs });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(makeJson());
      notify("복사됨");
    } catch (e) {
      setText(makeJson());
      notify("아래 칸에서 직접 복사하세요");
    }
  };

  const download = () => {
    try {
      const blob = new Blob([makeJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `가사보관함-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify("파일 저장 요청됨");
    } catch (e) {
      notify("저장 실패 — 복사를 이용해주세요");
    }
  };

  const restore = (raw) => {
    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : data.songs;
      if (!Array.isArray(list)) throw new Error("bad");
      const valid = list.filter((s) => s && s.id && typeof s.title === "string");
      if (!valid.length) throw new Error("empty");
      onImport(valid);
      onClose();
    } catch (e) {
      notify("형식이 올바르지 않아요");
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      restore(await f.text());
    } catch (err) {
      notify("파일을 읽지 못했어요");
    }
    e.target.value = "";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">백업</div>
        <div className="modal-row">
          <button className="btn-ghost" onClick={copy}>
            <Copy size={15} />
            <span>복사</span>
          </button>
          <button className="btn-ghost" onClick={download}>
            <Download size={15} />
            <span>파일</span>
          </button>
        </div>

        <div className="modal-sep" />

        <textarea
          className="modal-text"
          placeholder="복사한 내용을 붙여넣기"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-row">
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} />
            <span>파일</span>
          </button>
          <button className="btn-primary" disabled={!text.trim()} onClick={() => restore(text)} style={{ flex: 1, justifyContent: "center" }}>
            <Check size={15} />
            <span>복원</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} style={{ display: "none" }} />
      </div>
    </div>
  );
}

function Drawer({ open, songCount, sortMode, onSort, onAdd, onBackup, onClose, onClearAll }) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className={`drawer-overlay${open ? " open" : ""}`} onClick={onClose}>
      <div
        className={`drawer-panel${open ? " open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-gloss" />
        <div className="drawer-stat">
          <ListMusic size={14} />
          <span>{songCount}곡</span>
        </div>

        <div className="drawer-section">
          <button className="drawer-item" onClick={onAdd}>
            <span className="drawer-item-icon"><Plus size={16} strokeWidth={2.3} /></span>
            <span>추가</span>
          </button>
        </div>

        <div className="drawer-divider" />

        <div className="drawer-section">
          <button
            className={`drawer-item${sortMode === "recent" ? " active" : ""}`}
            onClick={() => onSort("recent")}
          >
            <span className="drawer-item-icon"><ArrowUpDown size={15} /></span>
            <span>최신순</span>
            {sortMode === "recent" && <Check size={15} className="drawer-check" />}
          </button>
          <button
            className={`drawer-item${sortMode === "title" ? " active" : ""}`}
            onClick={() => onSort("title")}
          >
            <span className="drawer-item-icon"><ArrowUpDown size={15} /></span>
            <span>제목순</span>
            {sortMode === "title" && <Check size={15} className="drawer-check" />}
          </button>
        </div>

        <div className="drawer-divider" />

        <div className="drawer-section">
          <button className="drawer-item" onClick={onBackup}>
            <span className="drawer-item-icon"><Archive size={15} /></span>
            <span>백업</span>
          </button>
          {!confirmClear ? (
            <button
              className="drawer-item danger"
              onClick={() => setConfirmClear(true)}
              disabled={songCount === 0}
            >
              <span className="drawer-item-icon"><Trash2 size={15} /></span>
              <span>삭제</span>
            </button>
          ) : (
            <div className="drawer-confirm">
              <AlertTriangle size={14} />
              <span>삭제할까요?</span>
              <div className="drawer-confirm-btns">
                <button
                  className="confirm-yes"
                  onClick={() => { onClearAll(); setConfirmClear(false); }}
                >
                  삭제
                </button>
                <button className="confirm-no" onClick={() => setConfirmClear(false)}>취소</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LyricsArchive() {
  const [songs, setSongs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("grid"); // grid | detail | form
  const [selected, setSelected] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState("recent");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null); // { id, mode }
  const [backupOpen, setBackupOpen] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const rootRef = useRef(null);
  const [vtId, setVtId] = useState(null); // 돌아갈 때 표지 이름표를 달 카드
  const vtResolve = useRef(null);

  // 화면이 실제로 바뀐 직후에 전환 애니메이션이 새 화면을 찍도록 알려준다
  useLayoutEffect(() => {
    if (vtResolve.current) {
      const r = vtResolve.current;
      vtResolve.current = null;
      r();
    }
  }, [view, selected]);

  // 브라우저의 화면 전환 기능(View Transitions)으로 표지가 그대로 커지고 줄어들게 한다. 미지원이면 그냥 바꾼다.
  const runTransition = (update, cleanup) => {
    const root = rootRef.current;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      update();
      if (cleanup) cleanup();
      return;
    }
    if (root) {
      root.dataset.vt = "1";
      root.dataset.vtok = "1";
    }
    const done = () => {
      if (root) delete root.dataset.vt;
      if (cleanup) cleanup();
    };
    try {
      const t = document.startViewTransition(
        () =>
          new Promise((resolve) => {
            vtResolve.current = resolve;
            update();
            setTimeout(resolve, 400);
          })
      );
      t.finished.then(done, done);
    } catch (e) {
      update();
      done();
    }
  };

  const openSong = (s, coverEl) => {
    if (coverEl) coverEl.style.viewTransitionName = "song-cover";
    runTransition(
      () => {
        setSelected(s);
        setView("detail");
      },
      () => {
        if (coverEl) coverEl.style.viewTransitionName = "";
      }
    );
  };

  const closeDetail = (opts) => {
    if (opts && opts.swipe === true) {
      setView("grid");
      return;
    }
    const id = selected ? selected.id : null;
    runTransition(
      () => {
        setVtId(id);
        setView("grid");
      },
      () => setVtId(null)
    );
  };

  // 눌렀을 때 손가락 쪽으로 커지고 늘어나며, 놓으면 젤리처럼 출렁이며 돌아오는 모션
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const SEL =
      ".icon-btn, .btn-primary, .btn-ghost, .pill-btn, .drawer-item, .sp-btn, .song-card, .search-clear, .cover-picker, .sp-seg button, .confirm-yes, .confirm-no";
    let cur = null;

    const compute = (e) => {
      const { el, rect } = cur;
      const dx = Math.max(-1.6, Math.min(1.6, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
      const dy = Math.max(-1.6, Math.min(1.6, ((e.clientY - rect.top) / rect.height - 0.5) * 2));
      const small = Math.max(rect.width, rect.height) <= 56;
      const card = el.classList.contains("song-card");
      const grow = small ? 1.07 : card ? 1.02 : 1.035;
      const k = small ? 0.035 : card ? 0.012 : 0.02;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const sx = grow + k * ax - k * 0.6 * ay;
      const sy = grow + k * ay - k * 0.6 * ax;
      const m = small ? 2 : 3;
      cur.transform = `translate(${(dx * m).toFixed(2)}px, ${(dy * m).toFixed(2)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      el.style.transform = cur.transform;
    };

    const release = () => {
      if (!cur) return;
      const { el, transform } = cur;
      cur = null;
      el.style.transform = "";
      el.style.transition = "";
      try {
        el.animate(
          [
            { transform, offset: 0, easing: "ease-out" },
            { transform: "scale(0.985, 1.015)", offset: 0.32, easing: "ease-in-out" },
            { transform: "scale(1.006, 0.996)", offset: 0.62, easing: "ease-out" },
            { transform: "none", offset: 1 },
          ],
          { duration: 460, easing: "linear" }
        );
      } catch (err) {
        // 애니메이션 미지원 환경에서는 그냥 원래 모양으로
      }
    };

    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!el || el.disabled || !root.contains(el)) return;
      if (cur) release();
      cur = { el, rect: el.getBoundingClientRect(), id: e.pointerId, transform: "" };
      el.style.transition = "transform 0.12s cubic-bezier(0.2, 0.9, 0.3, 1)";
      compute(e);
    };
    const onMove = (e) => {
      if (cur && e.pointerId === cur.id) compute(e);
    };
    const onUp = (e) => {
      if (cur && e.pointerId === cur.id) release();
    };

    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      release();
    };
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const changeFont = (delta) => {
    const n = Math.min(44, Math.max(16, fontSize + delta));
    setFontSize(n);
    try {
      window.storage.set("prefs", JSON.stringify({ fontSize: n }), false).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (alive && res?.value) {
          setSongs(JSON.parse(res.value));
        }
      } catch (e) {
        // 저장된 데이터 없음 — 첫 사용
      }
      try {
        const pf = await window.storage.get("prefs", false);
        if (alive && pf?.value) {
          const parsed = JSON.parse(pf.value);
          if (parsed.fontSize) setFontSize(parsed.fontSize);
        }
      } catch (e) {
        // 설정 없음
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setSongs(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
    } catch (e) {
      setToast("저장에 실패했어요. 다시 시도해주세요.");
      setTimeout(() => setToast(""), 2500);
    }
  }, []);

  const displayedSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = songs.filter(
      (s) => !q || (s.title || "").toLowerCase().includes(q) || (s.lyrics || "").toLowerCase().includes(q)
    );
    if (sortMode === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
    } else {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return list;
  }, [songs, sortMode, query]);

  const playerSong = player ? songs.find((s) => s.id === player.id) : null;

  const openPlayer = (song, mode, opts) => {
    if (getTimeableIndices(song.lyrics).length === 0) {
      showToast("가사가 없어요");
      return;
    }
    setPlayer({ id: song.id, mode });
  };

  const handleSaveLights = async (songId, lightClips, lightCfg) => {
    const next = songs.map((s) => (s.id === songId ? { ...s, lightClips, lightCfg } : s));
    await persist(next);
    setSelected((prev) => (prev && prev.id === songId ? { ...prev, lightClips, lightCfg } : prev));
  };

  const handleSaveTimings = async (songId, timings, groupSize) => {
    const next = songs.map((s) => (s.id === songId ? { ...s, timings, groupSize } : s));
    await persist(next);
    setSelected((prev) => (prev && prev.id === songId ? { ...prev, timings, groupSize } : prev));
    showToast("싱크 저장됨");
  };

  const handleImport = async (list) => {
    const map = new Map(songs.map((s) => [s.id, s]));
    list.forEach((s) => map.set(s.id, { createdAt: Date.now(), lyrics: "", cover: "", ...s }));
    await persist(Array.from(map.values()));
    showToast(`${list.length}곡 복원됨`);
  };

  const handleClearAll = async () => {
    await persist([]);
    setMenuOpen(false);
    setView("grid");
    setSelected(null);
  };

  const openForm = (song) => {
    setEditingTarget(song || null);
    setSheetClosing(false);
    setSheetOpen(true);
  };

  const closeFormNow = () => {
    setSheetOpen(false);
    setSheetClosing(false);
  };

  const closeForm = () => {
    setSheetClosing(true);
    setTimeout(closeFormNow, 240);
  };

  const handleSave = async (data) => {
    if (editingTarget) {
      const sameCount =
        getGroups(editingTarget.lyrics, editingTarget.groupSize).length ===
        getGroups(data.lyrics, editingTarget.groupSize).length;
      const timings = sameCount ? editingTarget.timings || null : null;
      const next = songs.map((s) => (s.id === editingTarget.id ? { ...s, ...data, timings } : s));
      await persist(next);
      setSelected({ ...editingTarget, ...data, timings });
    } else {
      const newSong = { id: crypto.randomUUID(), ...data, createdAt: Date.now() };
      const next = [newSong, ...songs];
      await persist(next);
    }
    closeForm();
  };

  const handleDelete = async (id) => {
    const next = songs.filter((s) => s.id !== id);
    await persist(next);
    setView("grid");
    setSelected(null);
  };

  // 데스크톱 키보드: N 새 노래, / 검색, M 메뉴, Esc 닫기/뒤로
  useEffect(() => {
    const onKey = (e) => {
      const tag = ((e.target && e.target.tagName) || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea";
      if (e.key === "Escape") {
        if (player) return;
        if (backupOpen) setBackupOpen(false);
        else if (sheetOpen) closeForm();
        else if (menuOpen) setMenuOpen(false);
        else if (view === "detail") {
          const b = document.querySelector(".detail-top .icon-btn");
          if (b) b.click();
        } else if (typing && e.target.blur) e.target.blur();
        return;
      }
      if (typing || player || sheetOpen || backupOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const lower = e.key.toLowerCase();
      if (e.key === "/") {
        e.preventDefault();
        const inp = document.querySelector(".search-wrap input");
        if (inp) inp.focus();
      } else if (lower === "n") {
        e.preventDefault();
        openForm(null);
      } else if (lower === "m") {
        setMenuOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app-root" ref={rootRef}>
      <style>{`
        /* =========================================================
           가사보관함 — 스타일 (한 벌로 정리)
           · 색: 무채색 + 위험(빨강)만
           · 유리 블러(backdrop-filter)는 위에 떠서 움직이는 큰 면(메뉴·백업창·독)에만
           · 모션: transform / opacity 위주, 화면 전체 filter 애니메이션 없음
           ========================================================= */
        .app-root {
          --bg: #000;
          --glass: rgba(255,255,255,0.07);
          --glass-strong: rgba(255,255,255,0.12);
          --glass-border: rgba(255,255,255,0.14);
          --glass-rim: rgba(255,255,255,0.3);
          --panel: rgba(28,28,32,0.92);
          --ink: #f5f5f7;
          --ink-dim: rgba(235,235,245,0.6);
          --ink-faint: rgba(235,235,245,0.35);
          --danger: #ff453a;
          --danger-soft: rgba(255,69,58,0.16);
          --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
          --ease-in: cubic-bezier(0.4, 0, 0.8, 0.3);
          --ease-soft: cubic-bezier(0.34, 1.2, 0.64, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
          background: var(--bg);
          color: var(--ink);
          height: 100dvh;
          max-height: 100dvh;
          width: 100%;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          isolation: isolate;
          touch-action: manipulation;
          overscroll-behavior: contain;
        }
        .app-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; scrollbar-width: none; }
        .app-root *::-webkit-scrollbar { display: none; }
        .app-root button { -webkit-user-select: none; user-select: none; font-family: inherit; }
        .app-root ::selection { background: rgba(255,255,255,0.14); }

        /* 배경: 블러 필터 대신 그라데이션 (가볍게) */
        .bg-glow {
          position: absolute; inset: 0; z-index: -1;
          background:
            radial-gradient(circle 380px at 40px 40px, rgba(38,41,51,0.55), transparent),
            radial-gradient(circle 340px at calc(100% - 20px) calc(100% - 20px), rgba(24,25,31,0.6), transparent);
        }

        /* ---------- 상단 바 ---------- */
        .top-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: calc(16px + env(safe-area-inset-top, 0px)) 18px 12px;
          flex-shrink: 0;
        }
        .wordmark { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
        .wordmark span { color: var(--ink-dim); }

        /* ---------- 버튼 ---------- */
        .icon-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          border-top-color: var(--glass-rim);
          background: rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.22), 0 4px 14px rgba(0,0,0,0.25);
          color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.15s ease, color 0.15s ease;
        }
        .icon-btn:active { background: var(--glass-strong); }
        .icon-btn.danger:active { color: var(--danger); background: var(--danger-soft); }

        .btn-primary, .btn-ghost, .pill-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 44px; padding: 0 22px;
          font-size: 14.5px; font-weight: 650;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.15s ease;
        }
        .btn-primary, .pill-btn {
          background: #f5f5f7; color: #0b0b0d;
          border: 1px solid rgba(255,255,255,0.25);
          border-top-color: rgba(255,255,255,0.5);
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        }
        .btn-primary:active, .pill-btn:active { background: #e4e4e8; }
        .btn-primary:disabled { opacity: 0.35; box-shadow: none; cursor: not-allowed; }
        .btn-ghost {
          background: var(--glass); color: var(--ink);
          border: 1px solid var(--glass-border);
          border-top-color: var(--glass-rim);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.22), 0 4px 14px rgba(0,0,0,0.25);
        }
        .btn-ghost:active { background: var(--glass-strong); }
        .pill-btn.ghost {
          background: rgba(255,255,255,0.1); color: var(--ink);
          border-color: var(--glass-border);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.25), 0 6px 18px rgba(0,0,0,0.3);
        }
        .pill-btn.ghost:active { background: var(--glass-strong); }

        /* ---------- 메뉴 (햄버거에서 부풀어 나오는 유리) ---------- */
        .drawer-overlay { position: absolute; inset: 0; z-index: 30; pointer-events: none; }
        .drawer-overlay.open { pointer-events: auto; }
        .drawer-panel {
          position: absolute;
          top: calc(64px + env(safe-area-inset-top, 0px));
          left: 14px;
          width: 132px;
          display: flex; flex-direction: column; align-items: stretch; gap: 3px;
          padding: 10px 7px;
          overflow: hidden;
          background:
            linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 35%, rgba(255,255,255,0) 55%),
            rgba(38,38,44,0.55);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          border-left-color: rgba(255,255,255,0.28);
          border-radius: 30px;
          box-shadow:
            inset 0 1.5px 1px rgba(255,255,255,0.45),
            inset 0 -12px 20px -14px rgba(0,0,0,0.5),
            0 20px 40px rgba(0,0,0,0.5);
          transform-origin: 24px -28px;
          transform: scale(0.4, 0.22);
          opacity: 0;
          transition: transform 0.22s var(--ease-in), opacity 0.16s ease;
        }
        .drawer-panel.open {
          transform: none; opacity: 1;
          animation: menuIn 0.48s var(--ease-out) both;
        }
        .drawer-panel.open > .drawer-stat,
        .drawer-panel.open > .drawer-section,
        .drawer-panel.open > .drawer-divider {
          animation: itemIn 0.32s var(--ease-out) both;
        }
        .drawer-panel.open > :nth-child(2) { animation-delay: 0.08s; }
        .drawer-panel.open > :nth-child(3) { animation-delay: 0.11s; }
        .drawer-panel.open > :nth-child(4) { animation-delay: 0.13s; }
        .drawer-panel.open > :nth-child(5) { animation-delay: 0.16s; }
        .drawer-panel.open > :nth-child(6) { animation-delay: 0.18s; }
        .drawer-panel.open > :nth-child(7) { animation-delay: 0.21s; }
        .drawer-gloss {
          position: absolute; top: -30%; left: -40%;
          width: 90px; height: 90px;
          background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0) 72%);
          pointer-events: none;
          transform: rotate(-15deg);
        }
        .drawer-stat {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 11.5px; color: var(--ink-dim);
          padding: 8px 6px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          margin-bottom: 3px;
        }
        .drawer-section { display: flex; flex-direction: column; gap: 3px; }
        .drawer-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 3px 10px; }
        .drawer-item {
          position: relative;
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--ink);
          font-size: 13.5px; font-weight: 500;
          padding: 11px 8px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.15s ease;
        }
        .drawer-item:active { background: rgba(255,255,255,0.14); }
        .drawer-item.active { font-weight: 650; background: rgba(255,255,255,0.11); }
        .drawer-item.danger { color: var(--danger); }
        .drawer-item.danger:active { background: var(--danger-soft); }
        .drawer-item:disabled { opacity: 0.35; cursor: not-allowed; }
        .drawer-item-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .drawer-check { position: absolute; right: 10px; }
        .drawer-confirm {
          display: flex; flex-direction: column; gap: 8px;
          margin: 2px; padding: 10px 12px;
          background: var(--danger-soft);
          border: 1px solid rgba(255,69,58,0.35);
          border-radius: 22px;
          font-size: 12px; color: var(--ink);
          animation: cardIn 0.3s var(--ease-out) both;
        }
        .drawer-confirm > span:nth-child(2) { flex: 1; }
        .drawer-confirm-btns { display: flex; gap: 8px; justify-content: flex-end; }

        /* ---------- 검색 ---------- */
        .search-wrap {
          margin: 0 16px 10px; height: 42px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 8px 0 14px;
          border-radius: 999px;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-top-color: rgba(255,255,255,0.28);
          color: var(--ink-dim);
          flex-shrink: 0;
          transition: border-color 0.18s ease;
        }
        .search-wrap:focus-within { border-color: rgba(255,255,255,0.4); }
        .search-wrap input {
          flex: 1; min-width: 0;
          background: transparent; border: none; outline: none;
          color: var(--ink); font-size: 14.5px; font-family: inherit;
        }
        .search-wrap input::placeholder { color: var(--ink-faint); }
        .search-clear {
          width: 26px; height: 26px; border-radius: 50%;
          border: none; background: rgba(255,255,255,0.14); color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out);
        }
        .no-result { text-align: center; padding: 70px 0; color: var(--ink-dim); font-size: 13.5px; }

        /* ---------- 목록 ---------- */
        .grid-scroll {
          flex: 1; min-height: 0;
          padding: 6px 16px 28px;
          overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
          animation: viewIn 0.36s var(--ease-out) both;
        }
        .song-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
          gap: 14px;
        }
        .song-card {
          background: transparent; border: none; padding: 0;
          text-align: left; cursor: pointer; color: var(--ink);
          animation: cardIn 0.45s var(--ease-out) backwards;
          transition: transform 0.3s var(--ease-out);
        }
        .song-cover {
          aspect-ratio: 1;
          border-radius: 22px;
          overflow: hidden;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.35);
        }
        .song-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .song-cover-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-faint);
        }
        .song-cover-fallback.large { color: var(--ink-dim); }
        .song-meta { padding: 9px 3px 0; }
        .song-title {
          font-size: 14.5px; font-weight: 650; letter-spacing: -0.1px; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .song-preview {
          font-size: 12px; color: var(--ink-dim); margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        @media (hover: hover) and (pointer: fine) {
          .song-card:hover { transform: translateY(-3px); }
        }

        .empty-wrap {
          flex: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 24px 24px 60px; text-align: center;
          animation: viewIn 0.36s var(--ease-out) both;
        }
        .empty-disc { margin-bottom: 18px; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.4)); }
        .empty-title { font-size: 17px; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.2px; }
        .empty-sub { font-size: 13.5px; color: var(--ink-dim); margin: 0 0 24px; }

        /* ===== 데스크톱 레이아웃 ===== */
        @media (min-width: 900px) {
          .top-bar { padding-left: 28px; padding-right: 28px; }
          .grid-scroll { padding-left: max(24px, calc((100% - 1180px) / 2)); padding-right: max(24px, calc((100% - 1180px) / 2)); }
          .song-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 22px; }
          .search-wrap { width: min(560px, calc(100% - 48px)); margin-left: auto; margin-right: auto; }
          .lyrics-card { width: calc(100% - 48px); max-width: 760px; margin-left: auto; margin-right: auto; }
          .sp-scroll { padding-left: max(26px, calc((100% - 780px) / 2)); padding-right: max(26px, calc((100% - 780px) / 2)); }
          .sp-root.lt-open .sp-scroll { padding-right: 340px; }
        }

        /* 가사 가운데 정렬 */
        .sp-lines { text-align: center; }
        .sp-line { transform-origin: center center; }
        .lyrics-text { text-align: center; }

        /* 조명이 켜지는 속도: 더 빠르게 (끌 때는 살짝 부드럽게) */

        .loading-wrap {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-dim); font-size: 13px;
        }

        /* ---------- 가사 상세 ---------- */
        .detail-wrap {
          flex: 1; min-height: 0;
          padding-bottom: 24px;
          overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
          animation: viewIn 0.38s var(--ease-out) backwards;
        }
        .detail-top {
          position: sticky; top: 0; z-index: 2;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 16px 0;
        }
        .detail-actions { display: flex; gap: 8px; align-items: center; }
        .confirm-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px 6px 14px;
          font-size: 12.5px; color: var(--ink-dim);
          background: var(--panel);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          animation: cardIn 0.28s var(--ease-out) both;
        }
        .confirm-yes {
          background: var(--danger); color: #fff; border: none;
          font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer;
          transition: transform 0.3s var(--ease-out);
        }
        .confirm-no {
          background: transparent; color: var(--ink-dim); border: none; border-radius: 999px;
          font-size: 12px; padding: 6px 4px; cursor: pointer;
        }
        .detail-hero {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center;
          padding: 18px 20px 24px;
        }
        .detail-bg {
          position: absolute; inset: -20px; z-index: 0;
          background-size: cover; background-position: center;
          filter: blur(50px) brightness(0.5) saturate(1.3);
          transform: scale(1.3);
          will-change: transform;
        }
        .detail-cover {
          position: relative; z-index: 1;
          width: 172px; height: 172px;
          border-radius: 30px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 20px 44px rgba(0,0,0,0.5);
          animation: softIn 0.5s var(--ease-out) both;
        }
        .detail-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .detail-title {
          position: relative; z-index: 1;
          margin: 18px 0 0; max-width: 300px;
          font-size: 21px; font-weight: 700; letter-spacing: -0.3px; text-align: center;
          animation: softIn 0.5s var(--ease-out) 0.05s both;
        }
        .detail-cta {
          position: relative; z-index: 1;
          display: flex; gap: 10px; margin-top: 18px;
          animation: cardIn 0.45s var(--ease-out) 0.1s both;
        }
        .lyrics-card {
          margin: 0 16px;
          padding: 20px 20px 22px;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-top-color: var(--glass-rim);
          border-radius: 28px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.18), 0 12px 32px rgba(0,0,0,0.3);
          animation: cardIn 0.45s var(--ease-out) 0.08s backwards;
        }
        .lyrics-text {
          margin: 0;
          font-family: -apple-system, 'Inter', sans-serif;
          font-size: 14.5px; line-height: 1.85; color: var(--ink);
          white-space: pre-wrap; word-break: break-word;
        }

        /* ---------- 노래 등록 시트 ---------- */
        .sheet-overlay {
          position: absolute; inset: 0; z-index: 10;
          display: flex; align-items: flex-end;
          background: rgba(0,0,0,0.45);
          animation: fadeIn 0.25s ease backwards;
        }
        .sheet-overlay.closing { animation: fadeOut 0.24s ease both; }
        #sheet-panel {
          width: 100%; height: 90%;
          display: flex; flex-direction: column;
          background: linear-gradient(155deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 40%), var(--panel);
          border-top: 1px solid var(--glass-rim);
          border-radius: 32px 32px 0 0;
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.25);
          animation: sheetUp 0.42s var(--ease-out) backwards;
        }
        .sheet-overlay.closing #sheet-panel { animation: sheetDown 0.24s var(--ease-in) both; }
        .sheet-body { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .sheet-grabber { width: 36px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.25); margin: 10px auto 0; flex-shrink: 0; }
        .sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px 4px; flex-shrink: 0; }
        .sheet-header h2 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.2px; }
        .sheet-scroll { flex: 1; min-height: 0; padding: 10px 18px 20px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .sheet-footer {
          display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
          padding: 14px 18px calc(18px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--glass-border);
        }
        .field-label { display: block; margin-bottom: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-dim); }
        .text-input, .lyrics-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid var(--glass-border);
          color: var(--ink);
          font-family: -apple-system, 'Inter', sans-serif; font-size: 14.5px;
          outline: none;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .text-input { height: 46px; padding: 0 18px; border-radius: 999px; }
        .lyrics-input { padding: 14px 18px; border-radius: 24px; resize: vertical; line-height: 1.7; min-height: 220px; }
        .text-input:focus, .lyrics-input:focus, .modal-text:focus { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.09); }
        .cover-picker {
          width: 116px; height: 116px; padding: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1px dashed var(--glass-border);
          border-radius: 28px; overflow: hidden;
          background: rgba(255,255,255,0.06);
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), border-color 0.16s ease;
        }
        .cover-picker img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cover-picker-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--ink-dim); font-size: 11.5px; font-weight: 500; }
        .link-btn { display: block; margin-top: 8px; padding: 0; background: none; border: none; color: var(--ink-dim); font-size: 12.5px; font-weight: 500; cursor: pointer; }
        .link-btn:active { color: var(--danger); }
        .hint { margin: 8px 0 0; font-size: 12px; color: var(--ink-dim); }
        .hint.error { color: var(--danger); }

        /* ---------- 부르기 / 싱크 화면 ---------- */
        .sp-root {
          position: absolute; inset: 0; z-index: 40;
          display: flex; flex-direction: column;
          background: #000;
          overflow: hidden;
          animation: viewIn 0.36s var(--ease-out) backwards;
        }
        .sp-bg {
          position: absolute; inset: -30px; z-index: 0;
          background-size: cover; background-position: center;
          filter: blur(64px) brightness(0.36) saturate(1.1);
          transform: scale(1.3);
          will-change: transform;
        }
        .sp-bg.plain { inset: 0; background: linear-gradient(160deg, #181b22, #0a0b0e); filter: none; transform: none; will-change: auto; }
        .sp-head {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 14px 8px;
        }
        .sp-title { flex: 1; text-align: center; font-size: 14px; font-weight: 650; color: var(--ink-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp-font { display: flex; gap: 8px; }
        .sp-body { position: relative; z-index: 1; flex: 1; min-height: 0; display: flex; }
        .sp-scroll {
          position: relative; flex: 1; min-height: 0;
          padding: 14px 26px 140px;
          overflow-y: auto; overscroll-behavior: contain;
        }
        .sp-scroll.pad-sync { padding-top: 26dvh; padding-bottom: 52dvh; }
        .sp-fade { position: absolute; left: 0; right: 0; pointer-events: none; z-index: 2; }
        .sp-fade.top { top: 0; height: 40px; background: linear-gradient(rgba(0,0,0,0.5), transparent); }
        .sp-fade.bot { bottom: 0; height: 130px; background: linear-gradient(transparent, rgba(0,0,0,0.55)); }
        .sp-lines { word-break: keep-all; overflow-wrap: anywhere; }
        .sp-line {
          margin: 0 0 0.7em;
          line-height: 1.45; font-weight: 700; letter-spacing: -0.3px; color: #fff;
          transform-origin: left center;
          transition: opacity 0.4s var(--ease-out), filter 0.4s var(--ease-out), transform 0.4s var(--ease-soft);
        }
        .sp-blank { height: 0.9em; }
        .sp-lines.sync .sp-line { opacity: 0.22; transform: scale(0.97); }
        .sp-lines.sync .sp-line.near { opacity: 0.36; filter: blur(1.2px); }
        .sp-lines.sync .sp-line.next { opacity: 0.62; filter: blur(0.5px); }
        .sp-lines.sync .sp-line.active { opacity: 1; filter: none; transform: scale(1.03); }
        .sp-line.start {
          background: rgba(255,255,255,0.14);
          border-radius: 18px;
          padding: 6px 14px;
          margin-left: -14px; margin-right: -14px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.25);
        }
        .sp-controls {
          position: absolute; left: 0; right: 0; z-index: 3;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          pointer-events: none;
        }
        .sp-controls > * { pointer-events: auto; }
        .sp-dock {
          display: flex; align-items: center; gap: 10px;
          padding: 8px;
          border-radius: 999px;
          background: linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 45%), rgba(38,38,44,0.55);
          backdrop-filter: blur(24px) saturate(170%);
          -webkit-backdrop-filter: blur(24px) saturate(170%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.4), 0 16px 36px rgba(0,0,0,0.5);
          animation: cardIn 0.4s var(--ease-out) both;
        }
        .sp-btn {
          width: 48px; height: 48px;
          border-radius: 50%; border: none;
          background: rgba(255,255,255,0.1); color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.15s ease;
        }
        .sp-btn:active { background: rgba(255,255,255,0.2); }
        .sp-btn.main { background: #f5f5f7; color: #0b0b0d; }
        .sp-btn.big { width: 84px; height: 84px; touch-action: manipulation; }
        .sp-tap-label { font-size: 17px; font-weight: 750; }
        .sp-clock { min-width: 50px; text-align: center; font-size: 13px; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
        .sp-next {
          max-width: 80%;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 13.5px; color: var(--ink-dim);
          background: rgba(40,40,46,0.72);
          border: 1px solid rgba(255,255,255,0.12);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-seg {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 16px 6px 18px;
          border-radius: 999px;
          font-size: 13px; color: var(--ink-dim);
          background: rgba(40,40,46,0.72);
          border: 1px solid rgba(255,255,255,0.12);
          animation: cardIn 0.4s var(--ease-out) both;
        }
        .sp-seg button {
          min-width: 34px; height: 34px; padding: 0 16px;
          border-radius: 999px; border: none;
          background: transparent; color: var(--ink);
          font-size: 14px; font-weight: 650;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.2s ease, color 0.2s ease;
        }
        .sp-seg button.on { background: #f5f5f7; color: #0b0b0d; }
        .sp-count {
          position: absolute; inset: 0; z-index: 5;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          font-size: 128px; font-weight: 800; color: #fff;
          text-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .sp-count span { animation: countPop 1s var(--ease-out) both; }

        /* ---------- 백업 창 ---------- */
        .modal-overlay {
          position: absolute; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,0.5);
          animation: fadeIn 0.22s ease both;
        }
        .modal-card {
          width: 100%; max-width: 330px;
          display: flex; flex-direction: column; gap: 12px;
          padding: 18px;
          border-radius: 34px;
          background: linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 40%), rgba(34,34,40,0.7);
          backdrop-filter: blur(24px) saturate(170%);
          -webkit-backdrop-filter: blur(24px) saturate(170%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.4), 0 24px 56px rgba(0,0,0,0.55);
          animation: modalIn 0.36s var(--ease-out) both;
        }
        .modal-title { font-size: 17px; font-weight: 700; text-align: center; }
        .modal-row { display: flex; gap: 8px; }
        .modal-row .btn-ghost { flex: 1; }
        .modal-sep { height: 1px; background: rgba(255,255,255,0.1); margin: 2px 8px; }
        .modal-text {
          width: 100%; min-height: 90px; max-height: 140px; resize: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--glass-border);
          color: var(--ink);
          border-radius: 22px; padding: 12px 16px;
          font-family: inherit; font-size: 13px;
          outline: none;
        }

        /* ---------- 알림 ---------- */
        .toast {
          position: absolute; bottom: 18px; left: 50%; z-index: 60;
          padding: 10px 18px;
          background: var(--panel);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          color: var(--ink); font-size: 12.5px; font-weight: 500;
          animation: toastIn 0.35s var(--ease-out) both;
        }

        /* =========================================================
           모션 — 짧고 부드럽게. 화면 전체 filter 애니메이션은 쓰지 않음
           ========================================================= */
        @keyframes viewIn { from { opacity: 0; transform: scale(1.015) translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes softIn { from { opacity: 0; filter: blur(10px); transform: translateY(8px) scale(0.98); } to { opacity: 1; filter: blur(0); transform: none; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes sheetDown { from { transform: none; } to { transform: translateY(100%); } }
        @keyframes menuIn {
          0% { transform: scale(0.4, 0.22); opacity: 0; }
          55% { transform: scale(1.015, 1.025); opacity: 1; }
          100% { transform: none; opacity: 1; }
        }
        @keyframes itemIn { from { opacity: 0; transform: translateY(-5px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 14px) scale(0.96); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes countPop {
          0% { opacity: 0; transform: scale(0.6); }
          30% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 0; transform: scale(1.35); }
        }

        /* 표지가 카드에서 가사 화면으로 그대로 커지는 전환 (공유 요소) */
        ::view-transition-group(song-cover) {
          animation-duration: 0.5s;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }
        ::view-transition-old(root), ::view-transition-new(root) {
          animation-duration: 0.3s;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }
        .app-root[data-vt] .grid-scroll,
        .app-root[data-vt] .detail-wrap,
        .app-root[data-vt] .song-card,
        .app-root[data-vt] .detail-cover { animation: none; }

        .sheet-drag { flex-shrink: 0; touch-action: none; cursor: grab; }

        @media (prefers-reduced-motion: reduce) {
          .app-root *, .app-root *::before { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }

        /* =========================================================
           최종 정렬 보정 — 반드시 맨 뒤에 둬서 앞쪽 규칙보다 우선하게 한다
           (예전에는 뒤쪽의 기본 규칙이 중앙 정렬/데스크톱 규칙을 덮어쓰고 있었음)
           ========================================================= */
        .sp-lines { text-align: center; }
        .sp-line { transform-origin: center center; }
        .lyrics-text { text-align: center; white-space: pre-line; }


        @media (min-width: 900px) {
          .top-bar { padding-left: 28px; padding-right: 28px; }
          .grid-scroll { padding-left: max(24px, calc((100% - 1180px) / 2)); padding-right: max(24px, calc((100% - 1180px) / 2)); }
          .song-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 22px; }
          .search-wrap { width: min(560px, calc(100% - 48px)); margin-left: auto; margin-right: auto; }
          .lyrics-card { width: calc(100% - 48px); max-width: 760px; margin-left: auto; margin-right: auto; }
          .sp-scroll { padding-left: max(26px, calc((100% - 780px) / 2)); padding-right: max(26px, calc((100% - 780px) / 2)); }
          /* 패널이 열려 있어도 가사는 화면 한가운데에 — 좌우를 같은 폭으로 비운다 */
          .sp-root.lt-open .sp-scroll { padding-left: max(26px, min(340px, calc((100% - 420px) / 2))); padding-right: max(26px, min(340px, calc((100% - 420px) / 2))); }
        }

        /* =========================================================
           조명: 겹침 없이 액자처럼 맞물리게(45도 이음), 안쪽으로 부드럽게 사라지는 그라데이션
           ========================================================= */
        /* 가장자리 어두운 덮개가 조명을 눌러서 얼룩지던 것 제거 — 글자에만 마스크를 쓴다 */
        .sp-fade { display: none; }
        .sp-scroll {
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 130px), transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 130px), transparent 100%);
        }

        /* =========================================================
           라이트 — 실제 조명처럼 번지는 빛 + 라이트 설정 화면
           ========================================================= */
        @property --c { syntax: "<color>"; inherits: false; initial-value: #000000; }
        .lt-rig { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; container-type: size; isolation: isolate; opacity: var(--pw, 0.9); }
        .lt-w { position: absolute; inset: 0; mix-blend-mode: screen; }
        .lt {
          position: absolute; inset: 0;
          --d: calc(var(--dp, 14) * 1cqmin);
          --stops: var(--c) 0,
            color-mix(in srgb, var(--c) 78%, transparent) calc(var(--d) * 0.1),
            color-mix(in srgb, var(--c) 52%, transparent) calc(var(--d) * 0.22),
            color-mix(in srgb, var(--c) 30%, transparent) calc(var(--d) * 0.36),
            color-mix(in srgb, var(--c) 15%, transparent) calc(var(--d) * 0.52),
            color-mix(in srgb, var(--c) 6%, transparent) calc(var(--d) * 0.7),
            transparent var(--d);
          --halo: color-mix(in srgb, var(--c) 26%, transparent) 0,
            color-mix(in srgb, var(--c) 12%, transparent) calc(var(--d) * 0.8),
            color-mix(in srgb, var(--c) 4%, transparent) calc(var(--d) * 1.5),
            transparent calc(var(--d) * 2.3);
          opacity: 1;
          transition: opacity 0.05s linear, --c 0.05s linear;
        }
        .lt::before { content: ""; position: absolute; inset: 0; }
        .lt.t-off { opacity: 0; transition-duration: 0.1s; }
        .lt-left .lt, .lt-right .lt { -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 24%, #000 76%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0, #000 24%, #000 76%, transparent 100%); }
        .lt-top .lt, .lt-bottom .lt { -webkit-mask-image: linear-gradient(to right, transparent 0, #000 24%, #000 76%, transparent 100%); mask-image: linear-gradient(to right, transparent 0, #000 24%, #000 76%, transparent 100%); }
        .lt-left .lt { background: linear-gradient(to right, var(--stops)); }
        .lt-left .lt::before { background: linear-gradient(to right, var(--halo)); }
        .lt-right .lt { background: linear-gradient(to left, var(--stops)); }
        .lt-right .lt::before { background: linear-gradient(to left, var(--halo)); }
        .lt-top .lt { background: linear-gradient(to bottom, var(--stops)); }
        .lt-top .lt::before { background: linear-gradient(to bottom, var(--halo)); }
        .lt-bottom .lt { background: linear-gradient(to top, var(--stops)); }
        .lt-bottom .lt::before { background: linear-gradient(to top, var(--halo)); }
        .lt.t-breathe { animation: ltBreathe 2.6s ease-in-out infinite; }
        .lt.t-strobe { animation: ltStrobe 0.22s steps(1, end) infinite; }
        @keyframes ltBreathe { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes ltStrobe { 0% { opacity: 1; } 50% { opacity: 0; } }

        .ls-root { position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column; background: #07080b; animation: blurIn 0.35s ease-out both; overflow-y: auto; }
        .ls-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 8px; }
        .ls-title { flex: 1; text-align: center; font-size: 14px; font-weight: 650; color: var(--ink-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .icon-btn.on { background: rgba(255,255,255,0.24); }

        /* 프리미어식 구성: 소스 · 프로그램 모니터 · 효과 컨트롤 / 아래 타임라인 */
        .ls-work { flex: 1; min-height: 340px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; padding: 4px 12px 10px; }
        @media (min-width: 1000px) { .ls-work { grid-template-columns: 300px minmax(0, 1fr) 300px; grid-template-rows: minmax(0, 1fr); } }
        .ls-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-radius: 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
        .ls-ph { flex-shrink: 0; padding: 8px 14px; font-size: 12px; font-weight: 650; color: var(--ink-dim); background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .ls-pb { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 18px; }
        .ls-mon-body { flex: 1; min-height: 200px; display: flex; align-items: center; justify-content: center; padding: 10px; container-type: size; }
        .ls-stage { position: relative; width: min(100cqw, calc(100cqh * 16 / 9)); aspect-ratio: 16 / 9; border-radius: 20px; overflow: hidden; background: #0b0c10; border: 1px solid rgba(255,255,255,0.12); box-shadow: inset 0 1px 1px rgba(255,255,255,0.12); }
        .ls-zone { position: absolute; inset: 0; cursor: pointer; touch-action: none; transition: background 0.12s; }
        .ls-zone:hover { background: rgba(255,255,255,0.04); }
        .ls-zone.on { background: rgba(255,255,255,0.07); }
        .z-left { clip-path: polygon(0 0, 50% 50%, 0 100%); }
        .z-right { clip-path: polygon(100% 0, 100% 100%, 50% 50%); }
        .z-top { clip-path: polygon(0 0, 100% 0, 50% 50%); }
        .z-bottom { clip-path: polygon(0 100%, 100% 100%, 50% 50%); }
        .ls-hint { position: absolute; font-size: 16px; color: rgba(255,255,255,0.4); pointer-events: none; }
        .h-left { left: 14px; top: 50%; transform: translateY(-50%); }
        .h-right { right: 14px; top: 50%; transform: translateY(-50%); }
        .h-top { top: 10px; left: 50%; transform: translateX(-50%); }
        .h-bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }
        .ls-caption { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 18%; text-align: center; font-size: 17px; font-weight: 650; line-height: 1.4; pointer-events: none; text-shadow: 0 2px 12px rgba(0,0,0,0.6); }
        .ls-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; font-size: 96px; font-weight: 800; }
        .ls-count span { animation: countPop 1s ease both; }
        .ls-transport { flex-shrink: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
        .ls-clock { min-width: 64px; font-size: 14px; font-variant-numeric: tabular-nums; color: var(--ink-dim); }
        .ls-chip { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: var(--ink); font-size: 13px; font-weight: 650; cursor: pointer; }
        .ls-chip .ls-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ink-faint); }
        .ls-chip.on { background: var(--danger); border-color: transparent; color: #fff; }
        .ls-chip.on .ls-dot { background: #fff; animation: ltBreathe 1.2s ease-in-out infinite; }
        .ls-root kbd { font: inherit; font-size: 10px; opacity: 0.55; margin-left: 5px; border: 1px solid currentColor; border-radius: 6px; padding: 0 4px; }

        /* 타임라인 */
        .ls-timeline { flex-shrink: 0; margin: 0 12px 10px; }
        .ls-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .ls-tool { height: 30px; min-width: 30px; padding: 0 8px; border-radius: 9px; border: none; background: rgba(255,255,255,0.07); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 650; cursor: pointer; }
        .ls-tool:active { background: rgba(255,255,255,0.2); }
        .ls-tool.on { background: #f5f5f7; color: #0b0b0d; }
        .ls-vsep { width: 1px; height: 20px; background: rgba(255,255,255,0.12); margin: 0 4px; }
        .ls-sp { flex: 1; }
        .ls-zoom { width: 120px; accent-color: #f5f5f7; }
        .ls-tl-main { display: flex; padding: 8px 12px 10px; user-select: none; -webkit-user-select: none; }
        .ls-labels { width: 78px; flex-shrink: 0; padding-top: 24px; }
        .ls-th { height: 56px; margin-top: 6px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-dim); }
        .ls-eye { width: 26px; height: 26px; border-radius: 8px; border: none; background: rgba(255,255,255,0.07); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .ls-eye.off { color: var(--ink-faint); background: transparent; }
        .ls-tl-right { flex: 1; min-width: 0; }
        .ls-scroll { overflow-x: auto; overflow-y: hidden; }
        .ls-canvas { position: relative; }
        .ls-ruler { position: relative; height: 24px; cursor: col-resize; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .ls-tick { position: absolute; top: 0; bottom: 0; padding: 4px 0 0 4px; border-left: 1px solid rgba(255,255,255,0.14); font-size: 10.5px; color: var(--ink-faint); white-space: nowrap; pointer-events: none; }
        .ls-lane { position: relative; height: 56px; margin-top: 6px; border-radius: 10px; background: #14161c; cursor: crosshair; }
        .ls-lane.muted .ls-clip { opacity: 0.4; }
        .ls-clip { position: absolute; top: 6px; bottom: 6px; border-radius: 9px; overflow: hidden; cursor: grab; touch-action: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28); }
        .ls-clip:active { cursor: grabbing; }
        .ls-clip.sel { box-shadow: 0 0 0 2px #000, inset 0 0 0 1px rgba(255,255,255,0.6); z-index: 3; }
        .ls-clip.t-breathe::after, .ls-clip.t-strobe::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(90deg, rgba(0,0,0,0.3) 0 3px, transparent 3px 9px); }
        .ls-clip.t-strobe::after { background-image: repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0 2px, transparent 2px 5px); }
        .ls-edge { position: absolute; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 2; }
        .ls-edge.l { left: 0; }
        .ls-edge.r { right: 0; }
        .ls-clip.sel .ls-edge { background: rgba(0,0,0,0.4); }
        .ls-curve { position: absolute; left: 0; top: 0; pointer-events: none; z-index: 1; }
        .ls-playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 8px rgba(255,255,255,0.6); pointer-events: none; z-index: 5; }
        .ls-marquee { position: absolute; border: 1px solid rgba(255,255,255,0.85); background: rgba(255,255,255,0.12); border-radius: 4px; pointer-events: none; z-index: 6; }
        .ls-timeline[data-tool="razor"] .ls-clip { cursor: crosshair; }
        .ls-timeline[data-tool="hand"] .ls-clip, .ls-timeline[data-tool="hand"] .ls-lane, .ls-timeline[data-tool="hand"] .ls-ruler { cursor: grab; }

        /* 타임라인 이동 바 (끌면 좌우 이동, 양끝을 끌면 확대/축소) */
        .ls-nav { position: relative; height: 18px; margin-top: 6px; border-radius: 9px; background: rgba(255,255,255,0.06); cursor: pointer; }
        .ls-thumb { position: absolute; top: 2px; bottom: 2px; min-width: 20px; border-radius: 7px; background: rgba(255,255,255,0.28); cursor: grab; touch-action: none; }
        .ls-thumb:active { cursor: grabbing; background: rgba(255,255,255,0.4); }
        .ls-thumb .h { position: absolute; top: 0; bottom: 0; width: 10px; cursor: ew-resize; }
        .ls-thumb .h.l { left: 0; }
        .ls-thumb .h.r { right: 0; }
        .ls-thumb .h::after { content: ""; position: absolute; top: 4px; bottom: 4px; left: 3px; width: 3px; border-radius: 2px; background: rgba(255,255,255,0.75); }

        /* 패널 안 컨트롤 */
        .ls-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 650; color: var(--ink-dim); margin-bottom: 8px; }
        .ls-cur { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.5); flex-shrink: 0; }
        .ls-val { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--ink-faint); }
        .ls-hintline { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
        .ls-hintline.big { font-size: 12.5px; color: var(--ink-dim); line-height: 1.5; }
        .ls-seg3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 999px; background: rgba(255,255,255,0.07); }
        .ls-seg3 button { padding: 9px 4px; border: none; border-radius: 999px; background: transparent; color: var(--ink); font-size: 12.5px; font-weight: 650; cursor: pointer; }
        .ls-seg3 button.on { background: #f5f5f7; color: #0b0b0d; }
        .ls-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 8px; }
        .ls-pal { display: grid; grid-template-columns: repeat(15, 1fr); gap: 3px; }
        .ls-sw { position: relative; aspect-ratio: 1; border-radius: 50%; border: 2px solid rgba(255,255,255,0.16); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease-out; }
        .ls-sw.sm { border-width: 1px; border-radius: 6px; }
        .ls-sw:active { transform: scale(0.88); }
        .ls-sw.on { border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.3); }
        .ls-sw kbd { margin: 0; border: none; color: #0b0b0d; opacity: 0.7; font-weight: 700; }
        .ls-slotbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--ink-faint); }
        .ls-range { width: 100%; margin: 0 0 14px; accent-color: #f5f5f7; }
        .ls-insp { display: flex; flex-direction: column; gap: 12px; }
        .ls-insp-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 650; }
        .ls-nums { display: flex; gap: 10px; }
        .ls-numl { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-dim); }
        .ls-num { width: 72px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: var(--ink); font-size: 12.5px; font-family: inherit; }
        .ls-btnrow { display: flex; flex-wrap: wrap; gap: 6px; }
        .ls-mini { padding: 6px 12px; border-radius: 999px; border: none; background: rgba(255,255,255,0.1); color: var(--ink); font-size: 12px; font-weight: 600; cursor: pointer; }
        .ls-mini:active { background: rgba(255,255,255,0.22); }
        .ls-mini.danger { color: var(--danger); }
        .ls-help { flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 8px 20px calc(12px + env(safe-area-inset-bottom, 0px)); font-size: 11.5px; color: var(--ink-faint); border-top: 1px solid rgba(255,255,255,0.08); }

        /* 색 선택기 (앱 디자인에 맞춤) */
        .cp { display: flex; flex-direction: column; gap: 10px; }
        .cp-sv { position: relative; height: 120px; border-radius: 14px; cursor: crosshair; touch-action: none; border: 1px solid rgba(255,255,255,0.14); }
        .cp-knob { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.5); pointer-events: none; }
        .cp-hue { -webkit-appearance: none; appearance: none; width: 100%; height: 12px; border-radius: 999px; outline: none; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
        .cp-hue::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.4); cursor: pointer; }
        .cp-hue::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.4); cursor: pointer; }
        .cp-row { display: flex; align-items: center; gap: 10px; padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); }
        .cp-dot { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.5); flex-shrink: 0; }
        .cp-hex { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--ink); font-size: 13px; font-family: inherit; letter-spacing: 0.5px; }

        /* 노래에 들어갈 때 움찔하던 문제: 블러·확대 애니메이션을 없애고, 화면 전환이 한 번이라도 쓰였으면 입장 애니메이션이 다시 시작되지 않게 */
        @keyframes blurIn { from { opacity: 0; transform: scale(1.012); } to { opacity: 1; transform: none; } }
        .app-root[data-vtok] .grid-scroll, .app-root[data-vtok] .detail-wrap, .app-root[data-vtok] .empty-wrap,
        .app-root[data-vtok] .song-card, .app-root[data-vtok] .detail-cover, .app-root[data-vtok] .detail-title,
        .app-root[data-vtok] .detail-cta, .app-root[data-vtok] .lyrics-card { animation: none; }
      `}</style>
      <div className="bg-glow" />

      <div className="top-bar">
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="메뉴">
          <Menu size={19} />
        </button>
        <div className="wordmark">가사<span>보관함</span></div>
        <div style={{ width: 40 }} />
      </div>

      {!loaded && <div className="loading-wrap">불러오는 중…</div>}

      {loaded && view === "grid" && (
        songs.length === 0 ? (
          <EmptyState onAdd={() => openForm(null)} />
        ) : (
          <>
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery("")} aria-label="지우기">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="grid-scroll">
              {displayedSongs.length === 0 ? (
                <div className="no-result">결과 없음</div>
              ) : (
                <div className="song-grid">
                  {displayedSongs.map((song, i) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      index={i}
                      onOpen={openSong}
                      vtName={vtId === song.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )
      )}

      {loaded && view === "detail" && selected && (
        <DetailView
          song={selected}
          onBack={closeDetail}
          onEdit={(s) => openForm(s)}
          onDelete={handleDelete}
          onSing={(s) => openPlayer(s, (s.timings && s.timings.length) || songHasLights(s) ? "play" : "view")}
          onRecord={(s) => openPlayer(s, "record")}
          onLights={(s) => openPlayer(s, "light")}
        />
      )}

      <Drawer
        open={menuOpen}
        songCount={songs.length}
        sortMode={sortMode}
        onSort={(m) => { setSortMode(m); setMenuOpen(false); }}
        onAdd={() => { setMenuOpen(false); openForm(null); }}
        onBackup={() => { setMenuOpen(false); setBackupOpen(true); }}
        onClose={() => setMenuOpen(false)}
        onClearAll={handleClearAll}
      />

      {sheetOpen && (
        <Sheet closing={sheetClosing} onDismiss={closeFormNow}>
          <SongForm initial={editingTarget} onCancel={closeForm} onSave={handleSave} />
        </Sheet>
      )}

      {player && playerSong && player.mode === "light" && (
        <LightStudio
          key={player.id + "-light"}
          song={playerSong}
          onClose={() => setPlayer(null)}
          onSave={(l, c) => handleSaveLights(player.id, l, c)}
        />
      )}

      {player && playerSong && player.mode !== "light" && (
        <SyncPlayer
          key={player.id + player.mode}
          song={playerSong}
          mode={player.mode}
          fontSize={fontSize}
          onFont={changeFont}
          onClose={() => setPlayer(null)}
          onSaveTimings={async (t, g) => {
            await handleSaveTimings(player.id, t, g);
            setPlayer({ id: player.id, mode: "play" });
          }}
        />
      )}

      {backupOpen && (
        <BackupModal
          songs={songs}
          onClose={() => setBackupOpen(false)}
          onImport={handleImport}
          notify={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
