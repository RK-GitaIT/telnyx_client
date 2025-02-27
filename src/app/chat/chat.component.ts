import { Component } from '@angular/core';

@Component({
  selector: 'app-chat',
  imports: [],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  chatList = [
    { name: 'Fikri Ruslandi', lastMessage: 'Ko, Kumaha Project anu eta...', messages: [] },
    { name: 'Moch Ramdhani', lastMessage: 'Ane menang contest $1000...', messages: [] },
    { name: 'Abu Abdullah Nugraha', lastMessage: 'is typing a message...', messages: [
        { text: 'Nanti kita technical meeting lomba jogja', sentByMe: false },
        { text: 'Semua satu team T’ome yang berangkat ke jogja?', sentByMe: true },
        { text: 'Iya, semua kita berangkat...', sentByMe: false }
      ] }
  ];
  selectedChat = this.chatList[2];
  newMessage = '';

  selectChat(chat: any) {
    this.selectedChat = chat;
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.selectedChat.messages.push({ text: this.newMessage, sentByMe: true });
      this.newMessage = '';
    }
  }
}
