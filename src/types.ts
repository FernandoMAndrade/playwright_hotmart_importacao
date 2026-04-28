export interface Lesson {
  module: string;
  title: string;
  hash: string;
  url: string;
  duration: string;
  thumbnail: string;
}

export interface VideoData {
  module: string;
  title: string;
  hash: string;
  m3u8_url: string;
  duration: string;
  thumbnail: string;
  captured_at: string;
}
