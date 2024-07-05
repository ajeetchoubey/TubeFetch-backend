const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require("cors")
// Ensure ffmpeg is in the system PATH or specify the path explicitly
const pathToFfmpeg = "/usr/bin/ffmpeg";
ffmpeg.setFfmpegPath(pathToFfmpeg); // Update with the correct path

app.use(cors());

app.get('/download', async (req, res) => {
  const videoURL = req.query.url;
  if (!ytdl.validateURL(videoURL)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  const format = req.query.format || 'mp4'; // default to mp4

  // Temporary file paths
  const tempVideoPath = path.join(__dirname, 'temp_video.mp4');
  const tempAudioPath = path.join(__dirname, 'temp_audio.mp3');
  const outputPath = path.join(__dirname, `output.${format}`);

  // Ensure previous temporary files are removed
  [tempVideoPath, tempAudioPath, outputPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  try {
    // Pipe video and audio streams to temporary files
    const videoStream = ytdl(videoURL, { quality: 'highestvideo' });
    const audioStream = ytdl(videoURL, { quality: 'highestaudio' });

    videoStream.pipe(fs.createWriteStream(tempVideoPath));
    audioStream.pipe(fs.createWriteStream(tempAudioPath));

    // Wait for both streams to finish
    await Promise.all([
      new Promise((resolve, reject) => videoStream.on('end', resolve).on('error', reject)),
      new Promise((resolve, reject) => audioStream.on('end', resolve).on('error', reject)),
    ]);

    // Use ffmpeg to merge video and audio or convert to mp3
    const command = ffmpeg();

    if (format === 'mp3') {
      command
        .input(tempAudioPath)
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => {
          res.header('Content-Disposition', `attachment; filename="audio.${format}"`);
          res.sendFile(outputPath, (err) => {
            if (err) {
              console.error('Error sending file:', err);
              res.status(500).send('Error sending file');
            }

            // Clean up temporary files
            fs.unlink(tempVideoPath, () => {});
            fs.unlink(tempAudioPath, () => {});
            fs.unlink(outputPath, () => {});
          });
        })
        .on('error', (err) => {
          console.error('Error during ffmpeg processing:', err);
          res.status(500).send('Error processing audio');
        });
    } else {
      command
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions('-c:v copy')
        .outputOptions('-c:a aac')
        .save(outputPath)
        .on('end', () => {
          res.header('Content-Disposition', `attachment; filename="video.${format}"`);
          res.sendFile(outputPath, (err) => {
            if (err) {
              console.error('Error sending file:', err);
              res.status(500).send('Error sending file');
            }

            // Clean up temporary files
            fs.unlink(tempVideoPath, () => {});
            fs.unlink(tempAudioPath, () => {});
            fs.unlink(outputPath, () => {});
          });
        })
        .on('error', (err) => {
          console.error('Error during ffmpeg processing:', err);
          res.status(500).send('Error processing video');
        });
    }
  } catch (error) {
    console.error('Error during download process:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
