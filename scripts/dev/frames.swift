import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Dev helper: extract PNG frames from a screen recording.
// usage: swift scripts/dev/frames.swift <video> <outDir> <startSec> <stepSec> <count>
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let out = a[2], start = Double(a[3])!, step = Double(a[4])!, count = Int(a[5])!
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
for i in 0..<count {
  let seconds = start + Double(i) * step
  let t = CMTime(seconds: seconds, preferredTimescale: 600)
  guard let img = try? gen.copyCGImage(at: t, actualTime: nil) else { continue }
  let url = URL(fileURLWithPath: "\(out)/f_\(String(format: "%03d", i))_\(String(format: "%.2fs", seconds)).png")
  let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
}
print("ok")
