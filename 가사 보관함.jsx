import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, ArrowLeft, Pencil, Trash2, X, ImagePlus, Music2, Check, Menu, ArrowUpDown, ListMusic, AlertTriangle, Search, Play, Pause, RotateCcw, Timer, Minus, Undo2, Archive, Copy, Download, Upload } from "lucide-react";

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

function SongCard({ song, index, onOpen }) {
  return (
    <button
      className="song-card"
      style={{ animationDelay: `${Math.min(index * 55, 500)}ms` }}
      onClick={() => onOpen(song)}
    >
      <div className="song-cover">
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

function DetailView({ song, onBack, onEdit, onDelete, onSing, onRecord }) {
  const [confirming, setConfirming] = useState(false);
  useWakeLock(true);
  const synced = !!(song.timings && song.timings.length);
  return (
    <div className="detail-wrap">
      <div className="detail-top">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
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
        <div className="detail-cover">
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
      <div className="sheet-grabber" />
      <div className="sheet-header">
        <h2>{initial ? "노래 수정" : "새 노래 기록"}</h2>
        <button className="icon-btn" onClick={onCancel} aria-label="닫기">
          <X size={20} />
        </button>
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
  const lineEls = useRef({});

  useWakeLock(true);

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
    const first = lineEls.current[g[0]];
    const last = lineEls.current[g[g.length - 1]];
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

  return (
    <div className="sp-root">
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

      <div ref={scrollRef} className={`sp-scroll${effMode === "view" ? "" : " pad-sync"}`}>
        <div className={`sp-lines${syncOn ? " sync" : ""}`} style={{ fontSize }}>
          {lines.map((l, i) => {
            if (!l.trim()) return <div key={i} className="sp-blank" />;
            const k = kOfLine[i];
            let cls = "sp-line";
            if (syncOn) {
              if (k === activeK) cls += " active";
              else if (k < activeK) cls += " done";
              else if (k === nextK) cls += " next";
            }
            if (!syncOn && phase === "ready" && canPick && startK > 0 && k === startK) cls += " start";
            return (
              <p
                key={i}
                ref={(el) => { lineEls.current[i] = el; }}
                className={cls}
                onClick={() => seek(k)}
              >
                {l}
              </p>
            );
          })}
        </div>
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
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState("recent");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null); // { id, mode }
  const [backupOpen, setBackupOpen] = useState(false);
  const [fontSize, setFontSize] = useState(24);

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

  useEffect(() => {
    if (sheetOpen) {
      const t = setTimeout(() => document.getElementById("sheet-panel")?.classList.add("open"), 10);
      return () => clearTimeout(t);
    }
  }, [sheetOpen]);

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
    setSheetOpen(true);
  };

  const closeForm = () => {
    document.getElementById("sheet-panel")?.classList.remove("open");
    setTimeout(() => setSheetOpen(false), 220);
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
    <div className="app-root">
      <style>{`
        :root { }
        .app-root {
          --bg: #000000;
          --glass: rgba(255,255,255,0.07);
          --glass-strong: rgba(255,255,255,0.11);
          --glass-border: rgba(255,255,255,0.14);
          --sheet-glass: rgba(28,28,32,0.78);
          --ink: #f5f5f7;
          --ink-dim: rgba(235,235,245,0.6);
          --ink-faint: rgba(235,235,245,0.35);
          --accent: #0a84ff;
          --accent-soft: rgba(10,132,255,0.16);
          --danger: #ff453a;
          --danger-soft: rgba(255,69,58,0.16);
          --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
          --spring-soft: cubic-bezier(0.22, 1, 0.36, 1);
          --tap: cubic-bezier(0.4, 0, 0.2, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
          background: var(--bg);
          color: var(--ink);
          height: 100dvh;
          max-height: 100dvh;
          width: 100%;
          border-radius: 0;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          isolation: isolate;
          touch-action: manipulation;
          overscroll-behavior: contain;
        }
        .app-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .app-root button { -webkit-user-select: none; user-select: none; }
        .app-root ::selection { background: var(--accent-soft); }

        .bg-glow {
          position: absolute; inset: 0; z-index: -1; overflow: hidden;
        }
        .bg-glow span {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
        }
        .bg-glow .b1 { width: 380px; height: 380px; background: #1c3a56; top: -140px; left: -100px; opacity: 0.35; }
        .bg-glow .b2 { width: 320px; height: 320px; background: #16171d; bottom: -120px; right: -80px; opacity: 0.5; }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: calc(16px + env(safe-area-inset-top, 0px)) 18px 12px;
          flex-shrink: 0;
        }
        .wordmark {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .wordmark span { color: var(--accent); }

        .add-fab {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.16);
          background: var(--accent);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          transition: transform 0.22s var(--spring), filter 0.16s var(--tap);
        }
        .add-fab:active { transform: scale(0.82) rotate(-8deg); filter: brightness(0.92); }

        .menu-btn { transition: transform 0.35s var(--spring), background 0.16s var(--tap); }
        .menu-btn:active { transform: scale(0.8) rotate(-14deg); }

        .drawer-overlay {
          position: absolute; inset: 0;
          background: transparent;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s var(--spring-soft);
          z-index: 30;
        }
        .drawer-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .drawer-panel {
          position: absolute;
          top: calc(64px + env(safe-area-inset-top, 0px));
          left: 14px;
          width: 132px;
          background:
            linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 35%, rgba(255,255,255,0) 55%),
            rgba(38,38,44,0.5);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          border-left-color: rgba(255,255,255,0.28);
          border-radius: 30px;
          box-shadow:
            inset 0 1.5px 1px rgba(255,255,255,0.45),
            inset 0 -12px 20px -14px rgba(0,0,0,0.5),
            inset 10px 0 16px -14px rgba(255,255,255,0.25),
            0 24px 50px rgba(0,0,0,0.55);
          padding: 10px 7px;
          transform-origin: top left;
          transform: scale(0.55) translateY(-12px);
          opacity: 0;
          transition: transform 0.42s var(--spring), opacity 0.25s var(--spring-soft);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 3px;
          overflow: hidden;
        }
        .drawer-panel.open { transform: scale(1) translateY(0); opacity: 1; }
        .drawer-gloss {
          position: absolute;
          top: -30%; left: -40%;
          width: 90px; height: 90px;
          background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 72%);
          filter: blur(2px);
          pointer-events: none;
          transform: rotate(-15deg);
        }
        .drawer-head { display: none; }
        .drawer-stat {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 11.5px; color: var(--ink-dim);
          padding: 8px 6px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          margin-bottom: 3px;
        }
        .drawer-section { display: flex; flex-direction: column; gap: 3px; }
        .drawer-label {
          font-size: 11px; font-weight: 600; color: var(--ink-faint);
          padding: 8px 12px 4px;
        }
        .drawer-item {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--ink);
          font-size: 13.5px; font-weight: 500;
          padding: 11px 8px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.2s var(--spring), background 0.15s var(--tap);
        }
        .drawer-item:active { transform: scale(0.92); background: rgba(255,255,255,0.14); }
        .drawer-item.active { color: var(--accent); font-weight: 650; background: rgba(255,255,255,0.1); }
        .drawer-item.danger { color: var(--danger); }
        .drawer-item.danger:active { background: var(--danger-soft); }
        .drawer-item:disabled { opacity: 0.35; cursor: not-allowed; }
        .drawer-item-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .drawer-check { position: absolute; right: 10px; }
        .drawer-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 3px 10px; }
        .drawer-confirm {
          display: flex; flex-direction: column; gap: 8px;
          background: var(--danger-soft);
          border: 1px solid rgba(255,69,58,0.35);
          border-radius: 15px;
          padding: 10px 12px;
          margin: 2px;
          font-size: 12px;
          color: var(--ink);
          animation: riseIn 0.35s var(--spring) both;
        }
        .drawer-confirm > span:nth-child(2) { flex: 1; }
        .drawer-confirm-btns { display: flex; gap: 8px; justify-content: flex-end; }

        @keyframes blurIn {
          0% { opacity: 0; filter: blur(22px); transform: scale(1.05); }
          100% { opacity: 1; filter: blur(0px); transform: scale(1); }
        }
        .grid-scroll {
          padding: 6px 16px 28px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          animation: blurIn 0.48s var(--spring-soft) both;
        }
        .song-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
          gap: 14px;
        }

        @keyframes riseIn {
          0% { opacity: 0; transform: translateY(26px) scale(0.86) rotate(-3deg); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.03) rotate(0.5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        .song-card {
          background: transparent;
          border: none;
          padding: 0;
          text-align: left;
          cursor: pointer;
          color: var(--ink);
          animation: riseIn 0.7s var(--spring) both;
          transition: transform 0.28s var(--spring);
        }
        .song-card:active { transform: scale(0.88) rotate(-1.5deg); }
        .song-card:hover { transform: translateY(-6px) scale(1.03); }
        .song-cover {
          aspect-ratio: 1;
          border-radius: 18px;
          overflow: hidden;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(10px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 24px rgba(0,0,0,0.35);
          transition: box-shadow 0.28s var(--spring);
        }
        .song-card:hover .song-cover { box-shadow: 0 1px 0 rgba(255,255,255,0.14) inset, 0 18px 36px rgba(0,0,0,0.5); }
        .song-cover img { width: 100%; height: 100%; object-fit: cover; }
        .song-cover-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-faint);
        }
        .song-meta { padding: 9px 3px 0; }
        .song-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.1px;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .song-preview {
          font-size: 12px;
          color: var(--ink-dim);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .empty-wrap {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center;
          flex: 1;
          padding: 24px 24px 60px;
          text-align: center;
          animation: blurIn 0.48s var(--spring-soft) both;
        }
        .empty-disc { margin-bottom: 18px; animation: riseIn 0.6s var(--spring) both; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.4)); }
        .empty-title { font-size: 17px; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.2px; }
        .empty-sub { font-size: 13.5px; color: var(--ink-dim); margin: 0 0 24px; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--accent);
          color: #fff;
          border: none;
          font-weight: 600;
          font-size: 14px;
          padding: 11px 20px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: transform 0.16s var(--tap), filter 0.16s var(--tap), box-shadow 0.16s var(--tap);
        }
        .btn-primary:active { transform: scale(0.88) rotate(-2deg); filter: brightness(0.95); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
        .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-ghost {
          background: var(--glass);
          backdrop-filter: blur(20px);
          color: var(--ink);
          border: 1px solid var(--glass-border);
          font-size: 14px;
          font-weight: 600;
          padding: 11px 18px;
          border-radius: 14px;
          cursor: pointer;
          transition: transform 0.16s var(--tap), background 0.16s var(--tap);
        }
        .btn-ghost:active { transform: scale(0.88); background: var(--glass-strong); }

        .icon-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: var(--glass);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.22s var(--spring), background 0.16s var(--tap), color 0.16s var(--tap);
        }
        .icon-btn:active { transform: scale(0.78) rotate(-8deg); background: var(--glass-strong); }
        .icon-btn.danger:active { color: var(--danger); background: var(--danger-soft); }

        .detail-wrap { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 24px; -webkit-overflow-scrolling: touch; animation: blurIn 0.5s var(--spring-soft) both; }
        .detail-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 16px 0;
          position: sticky; top: 0; z-index: 2;
        }
        .detail-actions { display: flex; gap: 8px; align-items: center; }
        .confirm-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--ink-dim);
          background: var(--sheet-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          padding: 6px 8px 6px 14px;
          border-radius: 16px;
          animation: riseIn 0.25s var(--spring) both;
        }
        .confirm-yes {
          background: var(--danger); color: #fff; border: none;
          font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 10px; cursor: pointer;
          transition: transform 0.15s var(--tap);
        }
        .confirm-yes:active { transform: scale(0.92); }
        .confirm-no {
          background: transparent; color: var(--ink-dim); border: none;
          font-size: 12px; padding: 6px 4px; cursor: pointer;
        }

        .detail-hero {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 18px 20px 24px;
          overflow: hidden;
        }
        .detail-bg {
          position: absolute; inset: -20px;
          background-size: cover; background-position: center;
          filter: blur(50px) brightness(0.5) saturate(1.4);
          transform: scale(1.3);
          z-index: 0;
        }
        .detail-cover {
          position: relative; z-index: 1;
          width: 172px; height: 172px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 20px 44px rgba(0,0,0,0.5);
          animation: coverPop 0.5s var(--spring) both;
        }
        @keyframes coverPop {
          0% { opacity: 0; transform: scale(0.6) translateY(20px) rotate(-6deg); }
          65% { opacity: 1; transform: scale(1.06) translateY(-4px) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
        }
        .detail-cover img { width: 100%; height: 100%; object-fit: cover; }
        .detail-title {
          position: relative; z-index: 1;
          font-weight: 700;
          letter-spacing: -0.3px;
          font-size: 21px;
          margin: 18px 0 0;
          text-align: center;
          max-width: 300px;
          animation: riseIn 0.5s var(--spring) 0.05s both;
        }

        .lyrics-card {
          margin: 0 16px 0;
          background: var(--glass);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 20px 20px 22px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset;
          animation: riseIn 0.5s var(--spring) 0.1s both;
        }
        .lyrics-text {
          font-family: -apple-system, 'Inter', sans-serif;
          font-size: 14.5px;
          line-height: 1.85;
          color: var(--ink);
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }

        .sheet-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(0px);
          display: flex; align-items: flex-end;
          opacity: 0;
          transition: opacity 0.28s var(--spring);
          z-index: 10;
        }
        .sheet-overlay.open { opacity: 1; }
        #sheet-panel {
          width: 100%;
          height: 90%;
          background: var(--sheet-glass);
          backdrop-filter: blur(34px) saturate(180%);
          -webkit-backdrop-filter: blur(34px) saturate(180%);
          border-top: 1px solid var(--glass-border);
          border-radius: 24px 24px 0 0;
          box-shadow: 0 1px 0 rgba(255,255,255,0.12) inset;
          display: flex; flex-direction: column;
          transform: translateY(100%);
          transition: transform 0.4s var(--spring);
        }
        #sheet-panel.open { transform: translateY(0); }
        .sheet-body {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .sheet-grabber {
          width: 36px; height: 5px;
          border-radius: 3px;
          background: rgba(255,255,255,0.25);
          margin: 10px auto 0;
          flex-shrink: 0;
        }

        .sheet-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px 4px;
          flex-shrink: 0;
        }
        .sheet-header h2 {
          font-weight: 700;
          letter-spacing: -0.2px;
          font-size: 18px;
          margin: 0;
        }
        .sheet-scroll {
          padding: 10px 18px 20px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .sheet-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 18px calc(18px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-dim);
          margin-bottom: 8px;
        }
        .text-input, .lyrics-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--glass-border);
          color: var(--ink);
          border-radius: 14px;
          padding: 12px 14px;
          font-family: -apple-system, 'Inter', sans-serif;
          font-size: 14.5px;
          outline: none;
          transition: border-color 0.18s var(--tap), background 0.18s var(--tap);
        }
        .lyrics-input { resize: vertical; line-height: 1.7; min-height: 220px; }
        .text-input:focus, .lyrics-input:focus { border-color: var(--accent); background: rgba(255,255,255,0.09); }

        .cover-picker {
          width: 116px; height: 116px;
          border-radius: 20px;
          border: 1px dashed var(--glass-border);
          background: rgba(255,255,255,0.06);
          cursor: pointer;
          overflow: hidden;
          padding: 0;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.16s var(--tap), border-color 0.16s var(--tap);
        }
        .cover-picker:active { transform: scale(0.95); border-color: var(--accent); }
        .cover-picker img { width: 100%; height: 100%; object-fit: cover; }
        .cover-picker-empty {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: var(--ink-dim); font-size: 11.5px; font-weight: 500;
        }
        .link-btn {
          display: block;
          background: none; border: none;
          color: var(--ink-dim);
          font-size: 12.5px;
          font-weight: 500;
          margin-top: 8px;
          cursor: pointer;
          padding: 0;
        }
        .link-btn:active { color: var(--danger); }
        .hint { font-size: 12px; color: var(--ink-dim); margin: 8px 0 0; }
        .hint.error { color: var(--danger); }

        @keyframes toastIn {
          0% { opacity: 0; transform: translate(-50%, 30px) scale(0.8); }
          60% { opacity: 1; transform: translate(-50%, -6px) scale(1.04); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .toast {
          position: absolute; bottom: 18px; left: 50%;
          background: var(--sheet-glass);
          backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          color: var(--ink); font-size: 12.5px; font-weight: 500;
          padding: 10px 18px; border-radius: 14px;
          z-index: 20;
          animation: toastIn 0.5s var(--spring) both;
        }

        /* ---- 버튼 전부 둥글게 / 보정 ---- */
        .btn-primary, .btn-ghost { border-radius: 999px; }
        .confirm-yes, .confirm-no { border-radius: 999px; }
        .cover-picker { border-radius: 28px; }
        .drawer-item { position: relative; }
        .toast { z-index: 60; }

        /* ---- 흰색 알약 버튼 (색 없이) ---- */
        .pill-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 12px 22px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          border-top-color: rgba(255,255,255,0.45);
          background: #f5f5f7;
          color: #0b0b0d;
          font-size: 14.5px; font-weight: 650;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
          transition: transform 0.22s var(--spring), background 0.16s var(--tap);
        }
        .pill-btn:active { transform: scale(0.86); }
        .pill-btn.ghost {
          background: rgba(255,255,255,0.1);
          color: var(--ink);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.25), 0 6px 18px rgba(0,0,0,0.3);
        }
        .detail-cta {
          position: relative; z-index: 1;
          display: flex; gap: 10px;
          margin-top: 18px;
          animation: riseIn 0.7s var(--spring) 0.12s both;
        }

        /* ---- 검색 ---- */
        .search-wrap {
          margin: 0 16px 10px;
          height: 42px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 8px 0 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-top-color: rgba(255,255,255,0.28);
          color: var(--ink-dim);
          flex-shrink: 0;
          transition: border-color 0.18s var(--tap);
        }
        .search-wrap:focus-within { border-color: rgba(255,255,255,0.4); }
        .search-wrap input {
          flex: 1; min-width: 0;
          background: transparent; border: none; outline: none;
          color: var(--ink);
          font-size: 14.5px; font-family: inherit;
        }
        .search-wrap input::placeholder { color: var(--ink-faint); }
        .search-clear {
          width: 26px; height: 26px; border-radius: 50%;
          border: none; background: rgba(255,255,255,0.14); color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.2s var(--spring);
        }
        .search-clear:active { transform: scale(0.8); }
        .no-result { text-align: center; padding: 70px 0; color: var(--ink-dim); font-size: 13.5px; }

        /* ---- 싱크 플레이어 ---- */
        .sp-root {
          position: absolute; inset: 0; z-index: 40;
          display: flex; flex-direction: column;
          background: #000;
          animation: blurIn 0.5s var(--spring-soft) both;
        }
        .sp-bg {
          position: absolute; inset: -30px; z-index: 0;
          background-size: cover; background-position: center;
          filter: blur(64px) brightness(0.36) saturate(1.1);
          transform: scale(1.3);
        }
        .sp-bg.plain { background: linear-gradient(160deg, #181b22, #0a0b0e); filter: none; transform: none; inset: 0; }
        .sp-head {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 14px 8px;
        }
        .sp-title {
          flex: 1; text-align: center;
          font-size: 14px; font-weight: 650; color: var(--ink-dim);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-font { display: flex; gap: 8px; }
        .sp-scroll {
          position: relative; z-index: 1;
          flex: 1; min-height: 0;
          overflow-y: auto; overscroll-behavior: contain;
          padding: 14px 26px 140px;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 36px, #000 calc(100% - 120px), transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 36px, #000 calc(100% - 120px), transparent 100%);
        }
        .sp-scroll.pad-sync { padding-top: 26dvh; padding-bottom: 52dvh; }
        .sp-lines { word-break: keep-all; overflow-wrap: anywhere; }
        .sp-line {
          margin: 0 0 0.7em;
          line-height: 1.45; font-weight: 700; letter-spacing: -0.3px;
          color: #fff;
          transform-origin: left center;
          transition: opacity 0.45s var(--spring-soft), filter 0.45s var(--spring-soft), transform 0.45s var(--spring-soft);
        }
        .sp-blank { height: 0.9em; }
        .sp-lines.sync .sp-line { opacity: 0.34; filter: blur(1.4px); transform: scale(0.96); }
        .sp-lines.sync .sp-line.done { opacity: 0.26; }
        .sp-lines.sync .sp-line.next { opacity: 0.6; filter: blur(0.6px); }
        .sp-lines.sync .sp-line.active { opacity: 1; filter: blur(0); transform: scale(1.04); }

        .sp-controls {
          position: absolute; left: 0; right: 0;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          z-index: 3;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          pointer-events: none;
        }
        .sp-controls > * { pointer-events: auto; }
        .sp-dock {
          display: flex; align-items: center; gap: 10px;
          padding: 8px;
          border-radius: 999px;
          background: linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 45%), rgba(38,38,44,0.5);
          backdrop-filter: blur(36px) saturate(200%);
          -webkit-backdrop-filter: blur(36px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.4), inset 0 -10px 18px -12px rgba(0,0,0,0.5), 0 20px 44px rgba(0,0,0,0.5);
          animation: riseIn 0.5s var(--spring) both;
        }
        .sp-btn {
          width: 48px; height: 48px;
          border-radius: 50%; border: none;
          background: rgba(255,255,255,0.1); color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.22s var(--spring), background 0.15s var(--tap);
        }
        .sp-btn:active { transform: scale(0.8); background: rgba(255,255,255,0.2); }
        .sp-btn.main { background: #f5f5f7; color: #0b0b0d; }
        .sp-btn.big { width: 84px; height: 84px; touch-action: manipulation; }
        .sp-tap-label { font-size: 17px; font-weight: 750; }
        .sp-clock {
          min-width: 50px; text-align: center;
          font-size: 13px; color: var(--ink-dim);
          font-variant-numeric: tabular-nums;
        }
        .sp-next {
          max-width: 80%;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 13.5px; color: var(--ink-dim);
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-count {
          position: absolute; inset: 0; z-index: 5;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          font-size: 128px; font-weight: 800; color: #fff;
          text-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .sp-count span { animation: countPop 1s var(--tap) both; }
        @keyframes countPop {
          0% { opacity: 0; transform: scale(0.4); filter: blur(14px); }
          35% { opacity: 1; transform: scale(1.06); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.5); filter: blur(10px); }
        }

        /* ---- 백업 모달 ---- */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .modal-overlay {
          position: absolute; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: fadeIn 0.25s var(--spring-soft) both;
        }
        .modal-card {
          width: 100%; max-width: 330px;
          display: flex; flex-direction: column; gap: 12px;
          padding: 18px;
          border-radius: 34px;
          background: linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 40%), rgba(34,34,40,0.62);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.16);
          border-top-color: rgba(255,255,255,0.4);
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.4), 0 30px 70px rgba(0,0,0,0.6);
          animation: modalPop 0.5s var(--spring) both;
        }
        .modal-title { font-size: 17px; font-weight: 700; text-align: center; }
        .modal-row { display: flex; gap: 8px; }
        .modal-row .btn-ghost { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .modal-sep { height: 1px; background: rgba(255,255,255,0.1); margin: 2px 8px; }
        .modal-text {
          width: 100%; min-height: 90px; max-height: 140px; resize: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--glass-border);
          color: var(--ink);
          border-radius: 22px;
          padding: 12px 16px;
          font-family: inherit; font-size: 13px;
          outline: none;
        }
        .modal-text:focus { border-color: rgba(255,255,255,0.4); }

        .sp-seg {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 16px 6px 18px;
          border-radius: 999px;
          font-size: 13px; color: var(--ink-dim);
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          animation: riseIn 0.5s var(--spring) both;
        }
        .sp-seg button {
          min-width: 34px; height: 34px; padding: 0 16px;
          border-radius: 999px; border: none;
          background: transparent; color: var(--ink);
          font-size: 14px; font-weight: 650;
          cursor: pointer;
          transition: transform 0.2s var(--spring), background 0.15s var(--tap);
        }
        .sp-seg button.on { background: #f5f5f7; color: #0b0b0d; }
        .sp-seg button:active { transform: scale(0.8); }

        .sp-line.start {
          background: rgba(255,255,255,0.14);
          border-radius: 18px;
          padding: 6px 14px;
          margin-left: -14px; margin-right: -14px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.25);
        }

        /* =========================================================
           스타일 통일 패스 — 색은 무채색, 유리 질감·둥글기·모션 강도를 한 규칙으로
           ========================================================= */
        .app-root {
          --accent: #f5f5f7;
          --accent-soft: rgba(255,255,255,0.12);
          --glass-rim: rgba(255,255,255,0.3);
          --spring: cubic-bezier(0.34, 1.3, 0.64, 1);
        }
        .app-root * { scrollbar-width: none; }
        .app-root *::-webkit-scrollbar { display: none; }

        /* 배경: 파란 기운 제거, 중립 회색 */
        .bg-glow .b1 { background: #262933; opacity: 0.55; }
        .bg-glow .b2 { background: #15161b; opacity: 0.6; }

        /* 글자 */
        .wordmark { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
        .wordmark span { color: var(--ink-dim); }
        .song-title { font-size: 14.5px; font-weight: 650; }
        .field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-dim); }

        /* 버튼: 높이·글자·둥글기 통일 (주 버튼은 흰색 알약) */
        .btn-primary, .btn-ghost, .pill-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 44px; padding: 0 22px;
          font-size: 14.5px; font-weight: 650;
          border-radius: 999px;
        }
        .btn-primary {
          background: #f5f5f7; color: #0b0b0d;
          border: 1px solid rgba(255,255,255,0.25);
          border-top-color: rgba(255,255,255,0.5);
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        }
        .btn-primary:active { transform: scale(0.94); filter: none; background: #e4e4e8; box-shadow: 0 3px 10px rgba(0,0,0,0.3); }
        .btn-primary:disabled { opacity: 0.35; box-shadow: none; transform: none; }

        /* 유리 질감: 모든 반투명 요소에 같은 윗면 하이라이트 */
        .icon-btn, .btn-ghost {
          border-top-color: var(--glass-rim);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.22), 0 4px 14px rgba(0,0,0,0.25);
        }
        .lyrics-card {
          border-radius: 28px;
          border-top-color: var(--glass-rim);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.18), 0 12px 32px rgba(0,0,0,0.3);
        }
        #sheet-panel {
          border-radius: 32px 32px 0 0;
          border-top-color: var(--glass-rim);
          background: linear-gradient(155deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02) 40%), rgba(30,30,36,0.72);
          box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.3);
        }

        /* 둥글기 단계: 22 / 28 / 30 / 32 / 알약 */
        .song-cover { border-radius: 22px; }
        .detail-cover { border-radius: 30px; }
        .drawer-confirm { border-radius: 22px; }
        .confirm-row { border-radius: 999px; }

        /* 입력칸: 한 줄은 알약, 여러 줄은 큰 둥근 사각형, 포커스도 무채색 */
        .text-input {
          height: 46px; padding: 0 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }
        .lyrics-input {
          padding: 14px 18px;
          border-radius: 24px;
          background: rgba(255,255,255,0.07);
        }
        .text-input:focus, .lyrics-input:focus, .modal-text:focus {
          border-color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.09);
        }

        /* 모션: 같은 성격은 유지하되 튕김·기울기를 줄여 차분하게 */
        @keyframes riseIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.94); }
          65% { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes coverPop {
          0% { opacity: 0; transform: scale(0.82) translateY(14px); }
          65% { opacity: 1; transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes toastIn {
          0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
          60% { opacity: 1; transform: translate(-50%, -3px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.9) translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        .song-card:hover { transform: translateY(-3px) scale(1.015); }
        .song-card:active { transform: scale(0.95); }
        .icon-btn:active { transform: scale(0.9); }
        .menu-btn:active { transform: scale(0.9); }
        .btn-ghost:active { transform: scale(0.95); }
        .pill-btn:active { transform: scale(0.94); }
        .sp-btn:active { transform: scale(0.9); }
        .drawer-item:active { transform: scale(0.97); }
        .search-clear:active { transform: scale(0.88); }

        .loading-wrap {
          display: flex; align-items: center; justify-content: center;
          flex: 1; color: var(--ink-dim); font-size: 13px;
        }
      `}</style>
      <div className="bg-glow"><span className="b1" /><span className="b2" /><span className="b3" /></div>

      <div className="top-bar">
        <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="메뉴">
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
                      onOpen={(s) => { setSelected(s); setView("detail"); }}
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
          onBack={() => setView("grid")}
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
        <div className={"sheet-overlay open"}>
          <div id="sheet-panel">
            <SongForm
              initial={editingTarget}
              onCancel={closeForm}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {player && songs.find((s) => s.id === player.id) && (
        <SyncPlayer
          key={player.id + player.mode}
          song={songs.find((s) => s.id === player.id)}
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
