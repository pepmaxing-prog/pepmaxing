import AVFoundation
import Foundation
import VideoToolbox

// Re-encodes a generated clip for bundling: 720x1280 H.264 at ~2.4 Mbps, no audio, fast-start.
// Usage: swift scripts/transcode-clip.swift <in.mp4> <out.mp4>
let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: transcode-clip.swift <in.mp4> <out.mp4>\n".data(using: .utf8)!)
  exit(2)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: output)

let targetWidth = 720
let targetHeight = 1280
let bitrate = 2_400_000

let asset = AVURLAsset(url: input)
let semaphore = DispatchSemaphore(value: 0)

Task {
  do {
    guard let track = try await asset.loadTracks(withMediaType: .video).first else {
      FileHandle.standardError.write("no video track\n".data(using: .utf8)!)
      exit(1)
    }
    let duration = try await asset.load(.duration)
    let frameRate = try await track.load(.nominalFrameRate)

    let reader = try AVAssetReader(asset: asset)
    let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(readerOutput)

    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: targetWidth,
      AVVideoHeightKey: targetHeight,
      AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: Int(frameRate.rounded()),
        AVVideoMaxKeyFrameIntervalKey: Int(frameRate.rounded()) * 2,
      ],
    ])
    writerInput.expectsMediaDataInRealTime = false
    writer.add(writerInput)

    guard reader.startReading(), writer.startWriting() else {
      FileHandle.standardError.write("could not start: \(reader.error?.localizedDescription ?? "") \(writer.error?.localizedDescription ?? "")\n".data(using: .utf8)!)
      exit(1)
    }
    writer.startSession(atSourceTime: .zero)

    let queue = DispatchQueue(label: "transcode")
    let done = DispatchSemaphore(value: 0)
    writerInput.requestMediaDataWhenReady(on: queue) {
      while writerInput.isReadyForMoreMediaData {
        if let sample = readerOutput.copyNextSampleBuffer() {
          writerInput.append(sample)
        } else {
          writerInput.markAsFinished()
          done.signal()
          return
        }
      }
    }
    done.wait()
    await writer.finishWriting()
    if writer.status != .completed {
      FileHandle.standardError.write("write failed: \(writer.error?.localizedDescription ?? "unknown")\n".data(using: .utf8)!)
      exit(1)
    }
    let size = (try? FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
    print("\(output.lastPathComponent): \(size / 1024) KB, \(String(format: "%.1f", CMTimeGetSeconds(duration)))s @ \(Int(frameRate.rounded())) fps")
  } catch {
    FileHandle.standardError.write("error: \(error)\n".data(using: .utf8)!)
    exit(1)
  }
  semaphore.signal()
}
semaphore.wait()
