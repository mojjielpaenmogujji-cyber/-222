import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { Plus, ArrowLeft, Pencil, Trash2, X, ImagePlus, Music2, Check, Menu, ArrowUpDown, ListMusic, AlertTriangle, Search, Play, Pause, RotateCcw, Timer, Minus, Undo2, Archive, Copy, Download, Upload, Clock, MoreVertical, LayoutGrid, List } from "lucide-react";

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
        <circle cx="44" cy="44" r="40" className="ed-a" strokeWidth="1.5" />
        <circle cx="44" cy="44" r="30" className="ed-b" strokeWidth="1" />
        <circle cx="44" cy="44" r="22" className="ed-b" strokeWidth="1" />
        <circle cx="44" cy="44" r="7" className="ed-c" />
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

/* 목록 보기용 행 카드 — Apple Notes / Spotify 라이브러리 리스트 패턴 */
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${sameYear ? "" : d.getFullYear() + ". "}${d.getMonth() + 1}. ${String(d.getDate()).padStart(2, "0")}`;
}

function SongRow({ song, index, onOpen, vtName }) {
  const synced = !!(song.timings && song.timings.length);
  return (
    <button
      className="song-row"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
      onClick={(e) => onOpen(song, e.currentTarget.querySelector(".song-row-thumb"))}
    >
      <div className="song-row-thumb" style={vtName ? { viewTransitionName: "song-cover" } : undefined}>
        {song.cover ? (
          <img src={song.cover} alt="" />
        ) : (
          <div className="song-row-fallback">
            <Music2 size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="song-row-meta">
        <div className="song-row-title">{song.title || "제목 없음"}</div>
        <div className="song-row-sub">{(song.lyrics || "").split("\n")[0] || "가사 미리보기 없음"}</div>
      </div>
      <div className="song-row-side">
        {synced && <span className="sync-badge">싱크</span>}
        <span className="song-row-date">{formatDate(song.createdAt)}</span>
      </div>
    </button>
  );
}

function DetailView({ song, onBack, onEdit, onDelete, onSing, onRecord }) {
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
        </div>
      </div>

      <div className="lyrics-card">
        <pre className="lyrics-text">{song.lyrics || "등록된 가사가 없어요."}</pre>
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
  const effMode =
    mode === "record"
      ? "record"
      : mode === "play" && timings && timings.length === groups.length
      ? "play"
      : "view";
  const canPick = effMode !== "view" && !!timings && timings.length === groups.length;

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

  useWakeLock(true);

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
    onDismiss: onClose,
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
      if (effMode === "play") {
        let k = -1;
        for (let i = 0; i < timings.length; i++) {
          if (timings[i] <= now) k = i;
          else break;
        }
        setActiveK(k);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, effMode, timings]);

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
    if (effMode !== "play" || (phase !== "running" && phase !== "paused")) return;
    const t = timings[k];
    clockRef.current = t;
    startRef.current = performance.now() - t;
    setClock(t);
    setActiveK(k);
  };

  // 데스크톱: 스페이스바로도 탭
  useEffect(() => {
    if (effMode !== "record") return;
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const syncOn =
    (effMode === "play" && (phase === "running" || phase === "paused")) ||
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
          if (k === activeK) cls += " active";
          else if (k === nextK) cls += " next";
          else if (Math.abs(k - activeK) <= 2) cls += " near";
        } else if (phase === "ready" && canPick && startK > 0 && k === startK) {
          cls += " start";
        }
        return (
          <p key={i} data-i={i} data-k={k} className={cls}>
            {l}
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

      <div className="sp-head">
        <button className="icon-btn" onClick={onClose} aria-label="닫기">
          <X size={19} />
        </button>
        <div className="sp-title">{song.title || "제목 없음"}</div>
        <div className="sp-font">
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

/* ---------- APK(WebView) 네이티브 브리지 ----------
   깃허브에서 빌드한 APK의 MainActivity 가 window.AndroidBridge 를 준다.
   · saveFile(name, base64)  — 다운로드 폴더에 파일 기록 (MediaStore)
   · requestStoragePermission() — 파일 접근 권한 요청 → 승인 결과를
     window 의 'android-storage-permission' 이벤트로 되돌려준다 */
const hasNativeBridge = () =>
  typeof window !== "undefined" && !!(window.AndroidBridge && typeof window.AndroidBridge.saveFile === "function");

function requestNativeStoragePermission(timeoutMs = 30000) {
  return new Promise((resolve) => {
    if (!hasNativeBridge()) return resolve(true); // 브라우저라면 권한 불필요
    const done = (granted) => {
      window.removeEventListener("android-storage-permission", h);
      clearTimeout(t);
      resolve(!!granted);
    };
    const h = (e) => done(e.detail && e.detail.granted);
    window.addEventListener("android-storage-permission", h);
    const t = setTimeout(() => done(false), timeoutMs);
    try {
      window.AndroidBridge.requestStoragePermission();
    } catch (e) {
      done(false);
    }
  });
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
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

  const download = async () => {
    const filename = `가사보관함-${new Date().toISOString().slice(0, 10)}.json`;
    // APK(WebView) 환경: 네이티브 저장 권한을 요청한 뒤 MediaStore 로 기록한다.
    // blob 다운로드는 WebView 에서 DownloadListener 도 안 타기 때문에 브리지가 유일한 통로다.
    if (hasNativeBridge()) {
      notify("저장 권한 확인 중…");
      const granted = await requestNativeStoragePermission();
      if (!granted) {
        notify("파일 저장 권한이 거부되었어요");
        return;
      }
      try {
        const ok = window.AndroidBridge.saveFile(filename, toBase64(makeJson()));
        notify(ok === false ? "파일 저장 실패 — 복사를 이용해주세요" : "다운로드 폴더에 저장했어요");
      } catch (e) {
        notify("파일 저장 실패 — 복사를 이용해주세요");
      }
      return;
    }
    try {
      const blob = new Blob([makeJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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
        {hasNativeBridge() && (
          <p className="hint" style={{ textAlign: "center" }}>APK 모드 — 저장 시 파일 접근 권한을 요청해요</p>
        )}

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

// 더보기 메뉴: One UI 팝업 메뉴 (둥근 카드, 항목 높이 44, 글자 16)
function Drawer({ open, songCount, onBackup, onClose, onClearAll }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!open) setConfirm(false);
  }, [open]);
  return (
    <div className={`oui-pop-scrim${open ? " open" : ""}`} onClick={onClose}>
      <div className="oui-pop" onClick={(e) => e.stopPropagation()}>
        <button className="oui-pop-item" onClick={onBackup}>
          <span className="ico"><Archive size={22} strokeWidth={1.7} /></span>
          <span>백업 / 복원</span>
        </button>
        <div className="oui-pop-sep" />
        {!confirm ? (
          <button className="oui-pop-item danger" disabled={songCount === 0} onClick={() => setConfirm(true)}>
            <span className="ico"><Trash2 size={22} strokeWidth={1.7} /></span>
            <span>전체 삭제</span>
          </button>
        ) : (
          <div className="oui-pop-confirm">
            <span>{songCount}곡을 모두 삭제할까요?</span>
            <div className="row">
              <button className="oui-pop-btn danger" onClick={() => { onClearAll(); setConfirm(false); }}>삭제</button>
              <button className="oui-pop-btn" onClick={() => setConfirm(false)}>취소</button>
            </div>
          </div>
        )}
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [scope, setScope] = useState("all"); // all | title | lyrics
  const topRef = useRef(null);
  const searchInputRef = useRef(null);
  const [player, setPlayer] = useState(null); // { id, mode }
  const [backupOpen, setBackupOpen] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [listMode, setListMode] = useState("grid"); // grid | list
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
    if (root) root.dataset.vt = "1";
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

  const applyPrefs = (fs, lm) => {
    try {
      window.storage.set("prefs", JSON.stringify({ fontSize: fs, listMode: lm }), false).catch(() => {});
    } catch (e) {}
  };

  const changeFont = (delta) => {
    const n = Math.min(44, Math.max(16, fontSize + delta));
    setFontSize(n);
    applyPrefs(n, listMode);
  };

  const toggleListMode = () => {
    const next = listMode === "grid" ? "list" : "grid";
    setListMode(next);
    applyPrefs(fontSize, next);
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
          if (parsed.listMode === "grid" || parsed.listMode === "list") setListMode(parsed.listMode);
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
    const list = songs.filter((s) => {
      if (!q) return true;
      const inTitle = (s.title || "").toLowerCase().includes(q);
      const inLyrics = (s.lyrics || "").toLowerCase().includes(q);
      return scope === "title" ? inTitle : scope === "lyrics" ? inLyrics : inTitle || inLyrics;
    });
    if (sortMode === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
    } else {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return list;
  }, [songs, sortMode, query, scope]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 60);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setScope("all");
  };
  // 스크롤하면 큰 제목이 접히면서 위쪽 작은 제목이 나타난다 (One UI 접히는 앱바)
  const onGridScroll = (e) => {
    const p = Math.min(1, Math.max(0, (e.currentTarget.scrollTop - 24) / 64));
    if (topRef.current) topRef.current.style.setProperty("--p", String(p));
  };
  useEffect(() => {
    if (view !== "grid") setSearchOpen(false);
  }, [view]);

  const playerSong = player ? songs.find((s) => s.id === player.id) : null;

  const openPlayer = (song, mode) => {
    if (getTimeableIndices(song.lyrics).length === 0) {
      showToast("가사가 없어요");
      return;
    }
    setPlayer({ id: song.id, mode });
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
           삼성 Memory 앱 스타일 (리소스에서 읽어낸 색·모양·치수)
           라이트: 배경 #f3f3f5 / 카드 #fcfcff · 다크: 배경 #010102 / 카드 #17171a · 포인트 #387aff
           ========================================================= */
        .app-root {
          color-scheme: light dark;
          --bg: #f3f3f5; --surface: #fcfcff; --surface-bright: #fcfcff; --surface-container: #e4e4e7; --surface-low: #f3f3f5;
          --ink: #010102; --ink-2: #252528; --ink-dim: #848487; --ink-faint: #a3a3a7;
          --outline: #ccccce; --outline-low: #e4e4e7;
          --primary: #387aff; --on-primary: #fcfcff; --selected: rgba(0,0,0,0.05); --fab: #fcfcff;
          --danger: #e5372d; --accent: #387aff; --accent-soft: rgba(56,122,255,0.14);
          --glass: rgba(0,0,0,0.05); --glass-strong: rgba(0,0,0,0.08); --glass-border: #e4e4e7; --sheet-glass: #fcfcff;
          --shadow: rgba(0,0,0,0.14);
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          .app-root {
            --bg: #010102; --surface: #17171a; --surface-bright: #252528; --surface-container: #3a3a3d; --surface-low: #252528;
            --ink: #fcfcff; --ink-2: #e9e9ec; --ink-dim: #a3a3a7; --ink-faint: #636368;
            --outline: #636368; --outline-low: #3a3a3d;
            --selected: rgba(255,255,255,0.2); --fab: #3a3a3d; --danger: #ff6b63;
            --accent-soft: rgba(56,122,255,0.24);
            --glass: rgba(255,255,255,0.07); --glass-strong: rgba(255,255,255,0.11); --glass-border: #3a3a3d; --sheet-glass: #17171a;
            --shadow: rgba(0,0,0,0.5);
          }
        }
        /* 가사를 부르는 화면은 항상 어둡게 */
        .app-root .sp-root {
          --ink: #f5f5f7; --ink-dim: rgba(235,235,245,0.6); --ink-faint: rgba(235,235,245,0.35);
          --glass: rgba(255,255,255,0.07); --glass-strong: rgba(255,255,255,0.11); --glass-border: rgba(255,255,255,0.14);
          --sheet-glass: rgba(28,28,32,0.78); --danger: #ff453a; --selected: rgba(255,255,255,0.2);
        }
        .app-root .bg-glow { display: none; }

        /* 위쪽 앱바: 작은 제목은 스크롤하면 나타난다 */
        .app-root .oui-top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; --p: 0; padding-top: env(safe-area-inset-top, 0px); }
        .oui-top-bg { position: absolute; inset: 0; background: var(--bg); box-shadow: 0 1px 0 var(--outline-low); opacity: var(--p); }
        .oui-top-row { position: relative; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 24px; }
        .oui-top-title { font-size: 20px; font-weight: 600; letter-spacing: -0.2px; opacity: var(--p); transform: translateY(calc((1 - var(--p)) * 6px)); }
        .oui-top-actions { display: flex; gap: 2px; }
        .oui-iconbtn { width: 48px; height: 48px; border-radius: 50%; border: none; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease, transform 0.12s ease; }
        .oui-iconbtn.sm { width: 40px; height: 40px; }
        .oui-iconbtn:active { background: var(--selected); transform: scale(0.92); }

        /* 큰 제목 */
        .app-root .oui-scroll { padding: 0 16px 168px; animation: none; }
        .oui-big { padding: calc(56px + env(safe-area-inset-top, 0px) + 44px) 8px 22px; }
        .oui-big h1 { margin: 0; font-size: 34px; line-height: 1.15; font-weight: 600; letter-spacing: -0.6px; }
        .oui-big p { margin: 6px 0 0; font-size: 14px; color: var(--ink-dim); }

        /* 곡 카드: 둥글기 12, 평평한 면 */
        .app-root .song-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
        .app-root .song-cover { border-radius: 12px; border: none; background: var(--surface-container); box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
        .app-root .song-card:hover .song-cover { box-shadow: none; }
        .app-root .song-cover-fallback { color: var(--ink-faint); }
        .app-root .song-meta { padding: 10px 2px 0; }
        .app-root .song-title { font-size: 16px; font-weight: 500; color: var(--ink); }
        .app-root .song-preview { font-size: 13px; color: var(--ink-dim); }
        .app-root .no-result { color: var(--ink-dim); }

        /* 아래 떠 있는 메뉴바 (플로팅 하단 내비게이션) */
        .oui-bottom { position: absolute; left: 0; right: 0; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 25; display: flex; justify-content: center; pointer-events: none; }
        .oui-nav { pointer-events: auto; display: flex; gap: 4px; padding: 6px; border-radius: 999px; background: var(--surface-bright); border: 0.5px solid var(--outline-low); box-shadow: 0 6px 24px var(--shadow); }
        .oui-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 76px; height: 52px; padding: 0 14px; border: none; border-radius: 999px; background: transparent; color: var(--ink-dim); font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, transform 0.12s ease; }
        .oui-nav-item.on { background: var(--selected); color: var(--ink); font-weight: 600; }
        .oui-nav-item:active { transform: scale(0.96); }

        /* 검색 버튼(FAB): 지름 56, 오른쪽 아래 */
        .oui-fab { position: absolute; right: 24px; bottom: calc(22px + env(safe-area-inset-bottom, 0px)); z-index: 26; width: 56px; height: 56px; border-radius: 50%; border: none; background: var(--fab); color: var(--ink); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px var(--shadow); cursor: pointer; transition: transform 0.12s ease; }
        .oui-fab:active { transform: scale(0.94); }

        /* 검색창: 아래에 떠 있는 알약(높이 52, 모서리 26), 위에 범위 칩 */
        @keyframes ouiUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .oui-searchdock { position: absolute; left: 0; right: 0; bottom: 0; z-index: 30; padding: 30px 10px calc(10px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(to top, var(--bg) 58%, transparent); animation: ouiUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .oui-chips { display: flex; gap: 6px; overflow-x: auto; padding: 0 6px 10px; scrollbar-width: none; }
        .oui-chips::-webkit-scrollbar { display: none; }
        .oui-chip { flex-shrink: 0; min-height: 40px; padding: 0 18px; border: none; border-radius: 20px; background: transparent; color: var(--ink-2); font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.15s ease; }
        .oui-chip.on { background: var(--selected); color: var(--ink); font-weight: 600; }
        .oui-field { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 6px 0 18px; border-radius: 26px; background: var(--surface); border: 0.5px solid var(--outline-low); box-shadow: 0 4px 18px var(--shadow); color: var(--ink); }
        .oui-inputwrap { position: relative; flex: 1; min-width: 0; height: 100%; display: flex; align-items: center; }
        .oui-inputwrap input { width: 100%; border: none; outline: none; background: transparent; color: var(--ink); font-size: 16px; font-family: inherit; }
        /* 의미 검색 안내 글자의 파랑·보라·하늘 그라데이션 */
        .oui-hint { position: absolute; left: 0; pointer-events: none; font-size: 16px; background: linear-gradient(90deg, #7659ee, #3581ff, #31afff, #79ccca); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; white-space: nowrap; }

        /* 더보기 팝업 메뉴 */
        .oui-pop-scrim { position: absolute; inset: 0; z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .oui-pop-scrim.open { opacity: 1; pointer-events: auto; }
        .oui-pop { position: absolute; top: calc(56px + env(safe-area-inset-top, 0px) + 4px); right: 12px; min-width: 210px; padding: 8px; border-radius: 22px; background: var(--surface-bright); border: 0.5px solid var(--outline-low); box-shadow: 0 8px 32px var(--shadow); transform-origin: top right; transform: scale(0.88); opacity: 0; transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease; }
        .oui-pop-scrim.open .oui-pop { transform: scale(1); opacity: 1; }
        .oui-pop-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 0 14px 0 10px; border: none; border-radius: 14px; background: transparent; color: var(--ink); font-size: 16px; font-family: inherit; text-align: left; cursor: pointer; }
        .oui-pop-item:active { background: var(--selected); }
        .oui-pop-item:disabled { opacity: 0.4; }
        .oui-pop-item.danger { color: var(--danger); }
        .oui-pop-item .ico { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .oui-pop-sep { height: 1px; margin: 4px 10px; background: var(--outline-low); }
        .oui-pop-confirm { display: flex; flex-direction: column; gap: 10px; padding: 8px 10px 6px; font-size: 14px; color: var(--ink-2); }
        .oui-pop-confirm .row { display: flex; gap: 8px; }
        .oui-pop-btn { flex: 1; min-height: 40px; border: none; border-radius: 20px; background: var(--surface-container); color: var(--ink); font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; }
        .oui-pop-btn.danger { background: var(--danger); color: #fcfcff; }

        /* 노래 상세 */
        .app-root .detail-wrap { background: var(--bg); }
        .app-root .detail-bg { display: none; }
        .app-root .detail-cover { border-radius: 22px; border: none; box-shadow: 0 8px 28px var(--shadow); }
        .app-root .detail-title { color: var(--ink); font-size: 24px; font-weight: 600; }
        .app-root .detail-top .icon-btn, .app-root .detail-actions .icon-btn { width: 48px; height: 48px; background: transparent; border: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; color: var(--ink); }
        .app-root .detail-top .icon-btn:active { background: var(--selected); }
        .app-root .confirm-row { background: var(--surface-container); border: none; color: var(--ink-2); -webkit-backdrop-filter: none; backdrop-filter: none; }
        .app-root .detail-cta .pill-btn { min-height: 48px; padding: 0 26px; border-radius: 26px; border: none; background: var(--primary); color: var(--on-primary); box-shadow: none; }
        .app-root .detail-cta .pill-btn.ghost { background: var(--surface-container); color: var(--ink); -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; }
        .app-root .lyrics-card { background: var(--surface); border: none; border-radius: 22px; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
        .app-root .lyrics-text { color: var(--ink); }

        /* 노래 추가·수정 시트, 대화상자, 버튼 */
        .app-root .sheet-overlay, .app-root .modal-overlay { background: rgba(0,0,0,0.4); -webkit-backdrop-filter: none; backdrop-filter: none; }
        .app-root #sheet-panel { background: var(--surface); border: none; border-radius: 26px 26px 0 0; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; color: var(--ink); }
        .app-root .sheet-grabber { background: var(--outline); }
        .app-root .sheet-header h2 { font-size: 18px; font-weight: 600; color: var(--ink); }
        .app-root .sheet-header .icon-btn { background: transparent; border: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; color: var(--ink); }
        .app-root .sheet-footer { border-top: none; }
        .app-root .field-label { color: var(--ink-dim); }
        .app-root .text-input, .app-root .lyrics-input, .app-root .modal-text { background: var(--surface-low); border: 1.5px solid transparent; border-radius: 12px; color: var(--ink); box-shadow: none; }
        .app-root .text-input { height: 48px; padding: 0 16px; }
        .app-root .text-input:focus, .app-root .lyrics-input:focus, .app-root .modal-text:focus { border-color: var(--primary); background: var(--surface-low); }
        .app-root .cover-picker { border-radius: 22px; background: var(--surface-low); border: 1.5px dashed var(--outline); color: var(--ink-dim); }
        .app-root .cover-picker-empty { color: var(--ink-dim); }
        .app-root .link-btn, .app-root .hint { color: var(--ink-dim); }
        .app-root .btn-primary { min-height: 48px; padding: 0 26px; border-radius: 26px; border: none; background: var(--primary); color: var(--on-primary); box-shadow: none; font-weight: 600; }
        .app-root .btn-ghost { min-height: 48px; padding: 0 24px; border-radius: 26px; border: none; background: var(--surface-container); color: var(--ink); box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; font-weight: 600; }
        .app-root .modal-card { background: var(--surface); border: none; border-radius: 26px; box-shadow: 0 12px 40px var(--shadow); -webkit-backdrop-filter: none; backdrop-filter: none; color: var(--ink); }
        .app-root .modal-sep { background: var(--outline-low); }
        .app-root .toast { background: var(--surface-container); color: var(--ink); border: none; border-radius: 22px; box-shadow: 0 4px 16px var(--shadow); -webkit-backdrop-filter: none; backdrop-filter: none; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }

        /* 목록 보기 — Apple Notes / Spotify 라이브러리 리스트 패턴 */
        .app-root .song-list { display: flex; flex-direction: column; gap: 2px; }
        .song-row {
          display: flex; align-items: center; gap: 14px;
          width: 100%; padding: 10px; border: none;
          background: transparent; border-radius: 18px;
          text-align: left; cursor: pointer; color: var(--ink);
          font-family: inherit;
          animation: cardIn 0.4s var(--ease-out) backwards;
          transition: background 0.15s ease, transform 0.3s var(--ease-out);
        }
        .song-row:active { background: var(--selected); }
        .song-row-thumb { width: 48px; height: 48px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--surface-container); }
        .song-row-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .song-row-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--ink-faint); }
        .song-row-meta { flex: 1; min-width: 0; }
        .song-row-title { font-size: 15.5px; font-weight: 600; letter-spacing: -0.1px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .song-row-sub { font-size: 12.5px; color: var(--ink-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .song-row-side { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
        .song-row-date { font-size: 11.5px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
        .sync-badge { font-size: 10.5px; font-weight: 600; color: var(--accent); background: var(--accent-soft); padding: 2px 8px; border-radius: 999px; }
        @media (hover: hover) and (pointer: fine) {
          .song-row:hover { background: var(--selected); }
        }

        /* 빈 화면 */
        .app-root .empty-title { color: var(--ink); font-weight: 600; }
        .app-root .empty-sub, .app-root .loading-wrap { color: var(--ink-dim); }
        .ed-a { fill: var(--surface-container); stroke: var(--outline-low); }
        .ed-b { fill: none; stroke: var(--outline-low); }
        .ed-c { fill: var(--primary); }
      `}</style>
      {loaded && view === "grid" && (
        <div className="oui-top" ref={topRef}>
          <div className="oui-top-bg" />
          <div className="oui-top-row">
            <div className="oui-top-title">가사보관함</div>
            <div className="oui-top-actions">
              {songs.length > 0 && (
                <button className="oui-iconbtn" onClick={toggleListMode} aria-label={listMode === "grid" ? "목록으로 보기" : "갤러리로 보기"}>
                  {listMode === "grid" ? <List size={24} strokeWidth={1.8} /> : <LayoutGrid size={24} strokeWidth={1.8} />}
                </button>
              )}
              <button className="oui-iconbtn" onClick={() => openForm(null)} aria-label="노래 추가">
                <Plus size={24} strokeWidth={1.8} />
              </button>
              <button className="oui-iconbtn" onClick={() => setMenuOpen(true)} aria-label="더보기">
                <MoreVertical size={24} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!loaded && <div className="loading-wrap">불러오는 중…</div>}

      {loaded && view === "grid" && (
        songs.length === 0 ? (
          <EmptyState onAdd={() => openForm(null)} />
        ) : (
          <div className="grid-scroll oui-scroll" onScroll={onGridScroll}>
            <div className="oui-big">
              <h1>가사보관함</h1>
              <p>{songs.length}곡{query.trim() ? ` · 검색 결과 ${displayedSongs.length}곡` : ""}</p>
            </div>
            {displayedSongs.length === 0 ? (
              <div className="no-result">결과 없음</div>
            ) : (
              {listMode === "grid" ? (
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
              ) : (
                <div className="song-list">
                  {displayedSongs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={i}
                      onOpen={openSong}
                      vtName={vtId === song.id}
                    />
                  ))}
                </div>
              )}
            )}
          </div>
        )
      )}

      {loaded && view === "grid" && songs.length > 0 && !searchOpen && (
        <>
          <div className="oui-bottom">
            <nav className="oui-nav" aria-label="정렬">
              <button className={`oui-nav-item${sortMode === "recent" ? " on" : ""}`} onClick={() => setSortMode("recent")}>
                <Clock size={22} strokeWidth={1.8} />
                <span>최신순</span>
              </button>
              <button className={`oui-nav-item${sortMode === "title" ? " on" : ""}`} onClick={() => setSortMode("title")}>
                <ArrowUpDown size={22} strokeWidth={1.8} />
                <span>제목순</span>
              </button>
            </nav>
          </div>
          <button className="oui-fab" onClick={openSearch} aria-label="검색">
            <Search size={24} strokeWidth={1.8} />
          </button>
        </>
      )}

      {loaded && view === "grid" && searchOpen && (
        <div className="oui-searchdock">
          <div className="oui-chips">
            {[["all", "전체"], ["title", "제목"], ["lyrics", "가사"]].map(([id, label]) => (
              <button key={id} className={`oui-chip${scope === id ? " on" : ""}`} onClick={() => setScope(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="oui-field">
            <Search size={20} strokeWidth={1.8} />
            <div className="oui-inputwrap">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                enterKeyHint="search"
                aria-label="검색"
              />
              {!query && <span className="oui-hint">노래 제목이나 가사 검색</span>}
            </div>
            <button className="oui-iconbtn sm" onClick={closeSearch} aria-label="검색 닫기">
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {loaded && view === "detail" && selected && (
        <DetailView
          song={selected}
          onBack={closeDetail}
          onEdit={(s) => openForm(s)}
          onDelete={handleDelete}
          onSing={(s) => openPlayer(s, s.timings && s.timings.length ? "play" : "view")}
          onRecord={(s) => openPlayer(s, "record")}
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

      {player && playerSong && (
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
