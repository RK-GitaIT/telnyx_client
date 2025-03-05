import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PhonePipe } from '../PhonePipe';

interface Recording {
  connection_id: string;
  id: string;
  status: string;
  channels: string;
  source: string;
  to: string;
  record_type: string;
  from: string;
  updated_at: string;
  created_at: string;
  call_control_id: string;
  conference_id: string | null;
  download_urls: {
    mp3: string;
  };
  call_leg_id: string;
  call_session_id: string;
  duration_millis: number;
  initiated_by: string;
  recording_ended_at: string;
  recording_started_at: string;
}

interface PaginationMeta {
  page_size: number;
  total_pages: number;
  page_number: number;
  total_results: number;
}

@Component({
  selector: 'app-recordings',
  imports: [CommonModule, PhonePipe],
  templateUrl: './recordings.component.html',
  styleUrls: ['./recordings.component.css']
})
export class RecordingsComponent implements OnInit {
  recordings: Recording[] = [];
  meta: PaginationMeta | null = null;
  currentPage: number = 1;
  pageSize: number = 15;

  // Audio controller: only one audio can play at a time.
  currentAudio: HTMLAudioElement | null = null;
  currentPlayingRecordingId: string | null = null;
  audioProgress: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getRecordings(this.currentPage);
  }

  get totalPages(): number {
    return this.meta?.total_pages ?? 0;
  }

  getRecordings(page: number) {
    const url = `https://api.telnyx.com/v2/recordings?page[number]=${page}&page[size]=${this.pageSize}`;
    this.http.get<any>(url).subscribe(response => {
      this.recordings = response.data;
      this.meta = response.meta;
      this.currentPage = this.meta?.page_number || 1;
    }, error => {
      console.error('Error fetching recordings', error);
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.getRecordings(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.getRecordings(this.currentPage - 1);
    }
  }

  /**
   * Toggle playback for the given recording.
   * If already playing, pause it; otherwise, stop any other playback and start this one.
   */
  togglePlayback(recording: Recording) {
    if (this.currentPlayingRecordingId === recording.id && this.currentAudio) {
      this.currentAudio.pause();
      this.currentPlayingRecordingId = null;
      this.currentAudio = null;
      this.audioProgress = 0;
    } else {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
        this.currentPlayingRecordingId = null;
        this.audioProgress = 0;
      }
      this.currentAudio = new Audio(recording.download_urls.mp3);
      this.currentAudio.play();
      this.currentPlayingRecordingId = recording.id;
      this.currentAudio.ontimeupdate = () => {
        if (this.currentAudio?.duration) {
          this.audioProgress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
        }
      };
      this.currentAudio.onended = () => {
        this.currentPlayingRecordingId = null;
        this.currentAudio = null;
        this.audioProgress = 0;
      };
    }
  }

  downloadRecording(recording: Recording) {
    window.open(recording.download_urls.mp3, '_blank');
  }

  deleteRecording(recording: Recording) {
    const confirmDelete = confirm('Are you sure you want to delete this recording?');
    if (!confirmDelete) return;
    const url = `https://api.telnyx.com/v2/recordings/${recording.id}`;
    this.http.delete(url).subscribe(() => {
      if (this.currentPlayingRecordingId === recording.id && this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
        this.currentPlayingRecordingId = null;
        this.audioProgress = 0;
      }
      this.getRecordings(this.currentPage);
    }, error => {
      console.error('Error deleting recording', error);
    });
  }
  
  formatDuration(durationMillis: number): string {
    const totalSeconds = Math.floor(durationMillis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
  
}
