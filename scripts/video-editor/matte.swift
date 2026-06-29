import Foundation
import Vision
import CoreImage
import AppKit

// usage: matte inDir outDir
let args = CommandLine.arguments
guard args.count >= 3 else { FileHandle.standardError.write("usage: matte inDir outDir\n".data(using:.utf8)!); exit(1) }
let inDir = args[1], outDir = args[2]
let fm = FileManager.default
try? fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let files = (try? fm.contentsOfDirectory(atPath: inDir))?.filter { $0.hasSuffix(".png") }.sorted() ?? []
let ciContext = CIContext(options: [.useSoftwareRenderer: false])
let clear = CIColor(red: 0, green: 0, blue: 0, alpha: 0)

var done = 0
for f in files {
    let inURL = URL(fileURLWithPath: inDir).appendingPathComponent(f)
    guard let nsimg = NSImage(contentsOf: inURL),
          let tiff = nsimg.tiffRepresentation,
          let bmp = NSBitmapImageRep(data: tiff),
          let cg = bmp.cgImage else { FileHandle.standardError.write("skip load \(f)\n".data(using:.utf8)!); continue }
    let ci = CIImage(cgImage: cg)
    let request = VNGeneratePersonSegmentationRequest()
    request.qualityLevel = .accurate
    request.outputPixelFormat = kCVPixelFormatType_OneComponent8
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([request]) } catch { FileHandle.standardError.write("perform fail \(f)\n".data(using:.utf8)!); continue }
    guard let result = request.results?.first else { FileHandle.standardError.write("no result \(f)\n".data(using:.utf8)!); continue }
    var maskCI = CIImage(cvPixelBuffer: result.pixelBuffer)
    let sx = ci.extent.width / maskCI.extent.width
    let sy = ci.extent.height / maskCI.extent.height
    maskCI = maskCI.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    let blend = CIFilter(name: "CIBlendWithMask")!
    blend.setValue(ci, forKey: kCIInputImageKey)
    blend.setValue(CIImage(color: clear).cropped(to: ci.extent), forKey: kCIInputBackgroundImageKey)
    blend.setValue(maskCI, forKey: kCIInputMaskImageKey)
    guard let out = blend.outputImage,
          let outCG = ciContext.createCGImage(out, from: ci.extent) else { continue }
    let rep = NSBitmapImageRep(cgImage: outCG)
    if let data = rep.representation(using: .png, properties: [:]) {
        try? data.write(to: URL(fileURLWithPath: outDir).appendingPathComponent(f)); done += 1
    }
}
print("matte done \(done)/\(files.count)")
