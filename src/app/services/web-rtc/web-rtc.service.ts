import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStreamHandler: ((stream: MediaStream) => void) | null = null;
  private remoteStream: MediaStream | null = null;

  private config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      return this.localStream;
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      throw error;
    }
  }

  async createPeerConnection(): Promise<void> {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(this.config);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    this.remoteStream = new MediaStream();

    this.peerConnection.ontrack = (event) => {
      console.log('🔊 Remote track received:', event.streams);
      if (event.streams[0]) {
        this.remoteStream = event.streams[0];

        const audioTracks = this.remoteStream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.error("❌ No audio tracks received from remote stream!");
        } else {
          console.log("✅ Remote stream contains an audio track.");
        }

        if (this.remoteStreamHandler) {
          this.remoteStreamHandler(this.remoteStream);
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`🔄 ICE Connection State: ${this.peerConnection!.iceConnectionState}`);
      if (this.peerConnection!.iceConnectionState === "failed") {
        console.error("❌ ICE Connection Failed! Possible network issue.");
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📡 New ICE candidate:', event.candidate);
        // TODO: Send candidate via your signaling server
      }
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    await this.createPeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (this.peerConnection && desc.sdp) {
        let modifiedSDP = desc.sdp.replace(
            /m=audio .* UDP\/TLS\/RTP\/SAVPF ([\d\s]*)/g,
            "m=audio 9 UDP/TLS/RTP/SAVPF 111"
        );

        const modifiedDesc = new RTCSessionDescription({
            type: desc.type,
            sdp: modifiedSDP
        });

        await this.peerConnection.setRemoteDescription(modifiedDesc);
        console.log("✅ Remote SDP Set with Forced Opus Codec");
    } else {
        console.error("❌ setRemoteDescription: SDP is undefined or PeerConnection is not available");
    }
}

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  /**
   * ✅ **Fixed `setRemoteStreamHandler` function**
   * This function sets a handler to receive the remote media stream.
   */
  setRemoteStreamHandler(callback: (stream: MediaStream) => void) {
    console.log("📡 Remote Stream Handler Set");
    this.remoteStreamHandler = callback;
  }

  closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}
