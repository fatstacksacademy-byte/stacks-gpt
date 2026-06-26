// vision-roi.swift — measure face + person (body) ROIs in a still frame.
//
// Usage:   build/vision-roi <image-path>
//
// Runs Apple Vision:
//   • VNDetectFaceRectanglesObservation  -> the (largest) face rectangle
//   • VNGeneratePersonSegmentationRequest -> the foreground person mask, thresholded to a bbox
//
// Prints ONE line of JSON to stdout, in SOURCE TOP-LEFT pixel coordinates:
//   {"image":"...","w":1920,"h":1080,
//    "face":{"cx":944,"cy":420,"w":260,"h":340},          // null if no face
//    "body_bbox":{"x":600,"y":120,"w":700,"h":960}}        // null if no person
//
// Vision reports normalized coordinates with a BOTTOM-LEFT origin; we convert to
// absolute TOP-LEFT pixels (y' = imgH - (y+h)*imgH ... see denorm()).
//
// Build:  xcrun swiftc -O scripts/video-editor/vision-roi.swift -o scripts/video-editor/build/vision-roi
// Exit:   0 = ran (face/body may individually be null), 2 = bad args / load failure.

import Foundation
import Vision
import CoreImage
import ImageIO

// ---- args ----
let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: vision-roi <image-path>\n".data(using: .utf8)!)
    exit(2)
}
let path = args[1]
let url = URL(fileURLWithPath: path)
guard FileManager.default.fileExists(atPath: path),
      let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let cg  = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    FileHandle.standardError.write("vision-roi: cannot load image at \(path)\n".data(using: .utf8)!)
    exit(2)
}
let imgW = CGFloat(cg.width)
let imgH = CGFloat(cg.height)

// Convert a Vision normalized rect (bottom-left origin, 0..1) to absolute
// TOP-LEFT pixel rect [x, y, w, h].
func denorm(_ r: CGRect) -> [Int] {
    let x = r.origin.x * imgW
    let w = r.size.width * imgW
    let h = r.size.height * imgH
    // Vision y is from the bottom; top-left y = imgH - (y_bottom + height)
    let yTop = imgH - (r.origin.y * imgH + h)
    return [Int(x.rounded()), Int(yTop.rounded()), Int(w.rounded()), Int(h.rounded())]
}

func jnull() -> String { "null" }
func jrect(_ b: [Int]) -> String {
    "{\"x\":\(b[0]),\"y\":\(b[1]),\"w\":\(b[2]),\"h\":\(b[3])}"
}

let handler = VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:])

// ---- 1) face ----
var faceJSON = jnull()
let faceReq = VNDetectFaceRectanglesRequest()
do {
    try handler.perform([faceReq])
    if let faces = faceReq.results, !faces.isEmpty {
        // largest face by normalized area
        let biggest = faces.max(by: {
            $0.boundingBox.width * $0.boundingBox.height <
            $1.boundingBox.width * $1.boundingBox.height
        })!
        let b = denorm(biggest.boundingBox)   // [x,y,w,h] top-left px
        let cx = b[0] + b[2] / 2
        let cy = b[1] + b[3] / 2
        faceJSON = "{\"cx\":\(cx),\"cy\":\(cy),\"w\":\(b[2]),\"h\":\(b[3])}"
    }
} catch {
    FileHandle.standardError.write("vision-roi: face request failed: \(error)\n".data(using: .utf8)!)
}

// ---- 2) person segmentation -> bbox ----
var bodyJSON = jnull()
let segReq = VNGeneratePersonSegmentationRequest()
segReq.qualityLevel = .accurate
segReq.outputPixelFormat = kCVPixelFormatType_OneComponent8   // 8-bit mask, 0..255
do {
    try handler.perform([segReq])
    if let result = segReq.results?.first {
        let mask = result.pixelBuffer                          // CVPixelBuffer, mask resolution
        CVPixelBufferLockBaseAddress(mask, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
        let mw = CVPixelBufferGetWidth(mask)
        let mh = CVPixelBufferGetHeight(mask)
        let rowBytes = CVPixelBufferGetBytesPerRow(mask)
        if let base = CVPixelBufferGetBaseAddress(mask) {
            let ptr = base.assumingMemoryBound(to: UInt8.self)
            let thresh: UInt8 = 128                            // person where mask > 0.5
            var minX = mw, minY = mh, maxX = -1, maxY = -1
            for y in 0..<mh {
                let row = ptr + y * rowBytes
                for x in 0..<mw {
                    if row[x] > thresh {
                        if x < minX { minX = x }
                        if x > maxX { maxX = x }
                        if y < minY { minY = y }
                        if y > maxY { maxY = y }
                    }
                }
            }
            if maxX >= 0 {
                // mask is top-left origin already; scale mask px -> source px
                let sx = imgW / CGFloat(mw)
                let sy = imgH / CGFloat(mh)
                let bx = Int((CGFloat(minX) * sx).rounded())
                let by = Int((CGFloat(minY) * sy).rounded())
                let bw = Int((CGFloat(maxX - minX + 1) * sx).rounded())
                let bh = Int((CGFloat(maxY - minY + 1) * sy).rounded())
                bodyJSON = jrect([bx, by, bw, bh])
            }
        }
    }
} catch {
    FileHandle.standardError.write("vision-roi: segmentation failed: \(error)\n".data(using: .utf8)!)
}

// ---- emit ----
let esc = path.replacingOccurrences(of: "\\", with: "\\\\")
              .replacingOccurrences(of: "\"", with: "\\\"")
let out = "{\"image\":\"\(esc)\",\"w\":\(Int(imgW)),\"h\":\(Int(imgH)),"
        + "\"face\":\(faceJSON),\"body_bbox\":\(bodyJSON)}"
print(out)
exit(0)
