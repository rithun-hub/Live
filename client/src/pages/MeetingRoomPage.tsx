import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
  Smile,
  Lock,
  Unlock,
  ShieldAlert,
  Send,
  X,
  Volume2,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface ParticipantPeer {
  socketId: string;
  name: string;
  role: 'HOST' | 'CO_HOST' | 'PARTICIPANT';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  avatarUrl?: string;
  stream?: MediaStream;
}

interface ChatMsg {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

const EMOJIS = ['👋', '🔥', '👏', '❤️', '💡', '🎉'];

export const MeetingRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Local media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Meeting state
  const [meetingTitle, setMeetingTitle] = useState('LIVE Meeting');
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Map<string, ParticipantPeer>>(new Map());
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [screenShareAllowed, setScreenShareAllowed] = useState(true);
  const [chatAllowed, setChatAllowed] = useState(true);

  // UI Drawers & Panels
  const [activeDrawer, setActiveDrawer] = useState<'chat' | 'participants' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // WebRTC Peer Connections: targetSocketId -> RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socket = getSocket();

  // Ice servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // 1. Initialize Local Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startLocalMedia = async () => {
      try {
        setMediaError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Camera/Mic permission denied or not available', err);
        setMediaError(
          'Camera or Microphone access was denied. You are connected in listen/view mode.'
        );
        setIsVideoOn(false);
        setIsMicOn(false);
      }
    };

    startLocalMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Connect to Socket Signaling and Join Room
  useEffect(() => {
    if (!roomCode) return;

    const guestName = sessionStorage.getItem('live_guest_name') || 'Participant';
    const displayName = user?.profile?.displayName || user?.username || guestName;

    socket.emit('join-room', {
      roomCode,
      userId: user?.id,
      name: displayName,
      avatarUrl: user?.profile?.avatarUrl,
    });

    // Handle room-joined event from server
    socket.on('room-joined', (data) => {
      setIsHost(data.isHost);
      setIsLocked(data.permissions.isLocked);
      setScreenShareAllowed(data.permissions.screenShareAllowed);
      setChatAllowed(data.permissions.chatAllowed);

      // Create peer connections for existing participants
      const initialMap = new Map<string, ParticipantPeer>();
      data.participants.forEach((p: ParticipantPeer) => {
        initialMap.set(p.socketId, p);
        createPeerConnection(p.socketId, true); // We initiate offer to existing members
      });
      setParticipants(initialMap);
    });

    // Participant joined
    socket.on('participant-joined', (data) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.set(data.participant.socketId, data.participant);
        return next;
      });
    });

    // Participant left
    socket.on('participant-left', (data) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });

      const pc = peersRef.current.get(data.socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(data.socketId);
      }
    });

    // Participant media changed
    socket.on('participant-media-changed', (data) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const p = next.get(data.socketId);
        if (p) {
          next.set(data.socketId, { ...p, ...data.updates });
        }
        return next;
      });
    });

    // Host Action: Forced Mute
    socket.on('host-action-mute', () => {
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        setIsMicOn(false);
      }
      alert('The meeting host has muted your microphone.');
    });

    // Host Action: Kick
    socket.on('host-action-kick', () => {
      alert('You have been removed from this meeting by the host.');
      navigate('/meetings');
    });

    // Permissions updated
    socket.on('permissions-updated', (data) => {
      setIsLocked(data.isLocked);
      setScreenShareAllowed(data.screenShareAllowed);
      setChatAllowed(data.chatAllowed);
    });

    // In-call chat message
    socket.on('new-meeting-message', (msg: ChatMsg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Emoji reaction
    socket.on('meeting-reaction', (data) => {
      setFloatingReaction(data.emoji);
      setTimeout(() => setFloatingReaction(null), 2500);
    });

    // Meeting error
    socket.on('meeting-error', (data) => {
      alert(data.message);
      navigate('/meetings');
    });

    // WebRTC Signaling Handlers: Offer, Answer, ICE
    socket.on('webrtc-offer', async (data) => {
      const pc = createPeerConnection(data.callerSocketId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', {
          targetSocketId: data.callerSocketId,
          answer,
        });
      } catch (err) {
        console.error('Error handling offer', err);
      }
    });

    socket.on('webrtc-answer', async (data) => {
      const pc = peersRef.current.get(data.responderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error('Error setting answer', err);
        }
      }
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      const pc = peersRef.current.get(data.senderSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding candidate', err);
        }
      }
    });

    // Fetch meeting details for title
    api.get(`/meetings/${roomCode}`)
      .then((res) => {
        if (res.success && res.meeting) {
          setMeetingTitle(res.meeting.title);
        }
      })
      .catch(() => {});

    // Duration timer
    const durationInterval = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationInterval);
      socket.emit('leave-room');
      socket.off('room-joined');
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('participant-media-changed');
      socket.off('host-action-mute');
      socket.off('host-action-kick');
      socket.off('permissions-updated');
      socket.off('new-meeting-message');
      socket.off('meeting-reaction');
      socket.off('meeting-error');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');

      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, [roomCode, user]);

  // Create RTCPeerConnection helper
  const createPeerConnection = (targetSocketId: string, isInitiator: boolean): RTCPeerConnection => {
    let pc = peersRef.current.get(targetSocketId);
    if (pc) return pc;

    pc = new RTCPeerConnection({ iceServers });
    peersRef.current.set(targetSocketId, pc);

    // Add local tracks if available
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc!.addTrack(track, localStream!);
      });
    }

    // ICE Candidate event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track received
    pc.ontrack = (event) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const p = next.get(targetSocketId);
        if (p) {
          next.set(targetSocketId, {
            ...p,
            stream: event.streams[0],
          });
        }
        return next;
      });
    };

    // If initiator, create and send Offer
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc!.createOffer();
          await pc!.setLocalDescription(offer);
          socket.emit('webrtc-offer', {
            targetSocketId,
            offer,
          });
        } catch (err) {
          console.error('Error creating offer', err);
        }
      };
    }

    return pc;
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      socket.emit('update-media-state', { isMuted: !audioTrack.enabled });
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
      socket.emit('update-media-state', { isVideoOff: !videoTrack.enabled });
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!screenShareAllowed && !isHost) {
      alert('Screen sharing is restricted by the host.');
      return;
    }

    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in all peer connections
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        socket.emit('update-media-state', { isScreenSharing: true });
      } catch (err) {
        console.warn('Screen share canceled or failed', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    // Restore camera track
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      });
    }

    socket.emit('update-media-state', { isScreenSharing: false });
  };

  // Raise Hand
  const toggleRaiseHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socket.emit('update-media-state', { isHandRaised: nextState });
  };

  // Send Floating Emoji Reaction
  const sendReaction = (emoji: string) => {
    socket.emit('send-reaction', { emoji });
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 2500);
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    socket.emit('send-meeting-message', { content: inputMsg.trim() });
    setInputMsg('');
  };

  // Host Controls: Mute & Kick
  const handleHostMute = (targetSocketId: string) => {
    socket.emit('host-mute-participant', { targetSocketId });
  };

  const handleHostKick = (targetSocketId: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      socket.emit('host-kick-participant', { targetSocketId });
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    socket.emit('host-update-permissions', { isLocked: nextLocked });
  };

  // Leave Call
  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    navigate('/meetings');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const participantList = Array.from(participants.values());

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0d0e] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-heading font-bold text-sm tracking-tight text-zinc-100">
              {meetingTitle}
            </h2>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
            <span>{roomCode}</span>
            <button
              onClick={copyMeetingLink}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Copy meeting link"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Center: Timer & Connection Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-zinc-300 bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800">
            <Radio size={12} className="text-[#e04f38]" />
            <span>{formatTimer(callDurationSeconds)}</span>
          </div>

          {isLocked && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <Lock size={10} /> LOCKED
            </span>
          )}
        </div>

        {/* Right Header: Drawer Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
            className={`p-2 rounded-lg text-xs transition-colors relative ${
              activeDrawer === 'participants'
                ? 'bg-[#e04f38] text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
            }`}
            title="Participants"
          >
            <Users size={16} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 text-[10px] flex items-center justify-center font-bold">
              {participantList.length + 1}
            </span>
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
            className={`p-2 rounded-lg text-xs transition-colors relative ${
              activeDrawer === 'chat'
                ? 'bg-[#e04f38] text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
            }`}
            title="In-call Chat"
          >
            <MessageSquare size={16} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#e04f38]" />
            )}
          </button>
        </div>
      </header>

      {/* Media Permission Warning Banner */}
      {mediaError && (
        <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} />
            <span>{mediaError}</span>
          </div>
          <button onClick={() => setMediaError(null)} className="text-amber-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Reaction Animation */}
      {floatingReaction && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-5xl animate-bounce pointer-events-none z-50">
          {floatingReaction}
        </div>
      )}

      {/* Main Video Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Videos Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr overflow-y-auto">
          {/* Self Video Tile */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center group shadow-md">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xl text-[#e04f38]">
                  {(user?.profile?.displayName || user?.username || 'You').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-medium">Camera Off</span>
              </div>
            )}

            {/* Tile Badges */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium">
              <span>{user?.profile?.displayName || user?.username || 'You'} (You)</span>
              {isHost && (
                <span className="text-[10px] px-1 py-0.2 rounded bg-[#e04f38]/20 text-[#e04f38] font-bold">
                  HOST
                </span>
              )}
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {!isMicOn && (
                <div className="p-1.5 rounded-lg bg-red-500/80 text-white" title="Muted">
                  <MicOff size={12} />
                </div>
              )}
              {isHandRaised && (
                <div className="p-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold" title="Hand Raised">
                  <Hand size={12} />
                </div>
              )}
            </div>
          </div>

          {/* Remote Participants Video Tiles */}
          {participantList.map((peer) => (
            <div
              key={peer.socketId}
              className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center group shadow-md"
            >
              {peer.stream && !peer.isVideoOff ? (
                <video
                  autoPlay
                  playsInline
                  ref={(v) => {
                    if (v && peer.stream && v.srcObject !== peer.stream) {
                      v.srcObject = peer.stream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xl text-zinc-300">
                    {peer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{peer.name}</span>
                </div>
              )}

              {/* Tile Badges */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium">
                <span>{peer.name}</span>
                {peer.role === 'HOST' && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-[#e04f38]/20 text-[#e04f38] font-bold">
                    HOST
                  </span>
                )}
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {peer.isMuted && (
                  <div className="p-1.5 rounded-lg bg-red-500/80 text-white" title="Muted">
                    <MicOff size={12} />
                  </div>
                )}
                {peer.isHandRaised && (
                  <div className="p-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold animate-bounce" title="Hand Raised">
                    <Hand size={12} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Slide-out Drawer: Chat or Participants */}
        {activeDrawer && (
          <aside className="w-80 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col z-30 animate-slide-up">
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-300">
                {activeDrawer === 'chat' ? 'In-Call Messages' : `Participants (${participantList.length + 1})`}
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Content */}
            {activeDrawer === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500">
                      No messages yet. Send a note to participants.
                    </div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-200">{m.senderName}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-300 bg-zinc-900 p-2 rounded-xl border border-zinc-800 break-words">
                          {m.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={chatAllowed || isHost ? 'Type a message...' : 'Chat disabled by host'}
                    disabled={!chatAllowed && !isHost}
                    className="flex-1 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#e04f38] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMsg.trim() || (!chatAllowed && !isHost)}
                    className="p-2 rounded-xl bg-[#e04f38] hover:bg-[#cc422d] text-white disabled:opacity-40"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* Participants List Content */}
            {activeDrawer === 'participants' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                {/* Self */}
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      {user?.profile?.displayName || user?.username || 'You'} (You)
                    </span>
                    {isHost && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e04f38]/20 text-[#e04f38]">
                        HOST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    {isMicOn ? <Mic size={13} /> : <MicOff size={13} className="text-red-400" />}
                    {isVideoOn ? <Video size={13} /> : <VideoOff size={13} />}
                  </div>
                </div>

                {/* Peers */}
                {participantList.map((p) => (
                  <div
                    key={p.socketId}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-zinc-300">{p.name}</span>
                      {p.role === 'HOST' && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e04f38]/20 text-[#e04f38]">
                          HOST
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Host action controls */}
                      {isHost && (
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={() => handleHostMute(p.socketId)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            title="Mute participant"
                          >
                            <MicOff size={11} />
                          </button>
                          <button
                            onClick={() => handleHostKick(p.socketId)}
                            className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
                            title="Remove participant"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}

                      {p.isMuted ? <MicOff size={13} className="text-red-400" /> : <Mic size={13} />}
                      {p.isVideoOff ? <VideoOff size={13} /> : <Video size={13} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-6 z-20">
        {/* Left Side: Room Code Pill */}
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">{meetingTitle}</span>
          <span>•</span>
          <span>{participantList.length + 1} connected</span>
        </div>

        {/* Center: Main Call Buttons */}
        <div className="flex items-center gap-3 mx-auto md:mx-0">
          {/* Mic */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl transition-colors shadow-md ${
              isMicOn
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-2xl transition-colors shadow-md ${
              isVideoOn
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition-colors shadow-md ${
              isScreenSharing
                ? 'bg-[#e04f38] text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleRaiseHand}
            className={`p-3.5 rounded-2xl transition-colors shadow-md ${
              isHandRaised
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            title="Raise Hand"
          >
            <Hand size={20} />
          </button>

          {/* Reactions Dropdown */}
          <div className="relative group/emojis">
            <button
              className="p-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="React"
            >
              <Smile size={20} />
            </button>
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center gap-1.5 opacity-0 pointer-events-none group-hover/emojis:opacity-100 group-hover/emojis:pointer-events-auto transition-opacity">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => sendReaction(e)}
                  className="p-2 hover:scale-125 transition-transform text-xl"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Host Lock Control */}
          {isHost && (
            <button
              onClick={handleToggleLock}
              className={`p-3.5 rounded-2xl transition-colors ${
                isLocked
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title={isLocked ? 'Unlock Meeting' : 'Lock Meeting'}
            >
              {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
          )}

          {/* Leave Call Button */}
          <button
            onClick={handleLeaveCall}
            className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-lg transition-colors ml-2"
            title="Leave Meeting"
          >
            <PhoneOff size={18} />
            <span className="hidden sm:inline text-xs">Leave Call</span>
          </button>
        </div>

        {/* Right Side Empty Spacer */}
        <div className="hidden md:block w-28 text-right text-xs text-zinc-500 font-mono">
          WebRTC P2P
        </div>
      </footer>
    </div>
  );
};

