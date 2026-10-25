// 自動生成（npm run tokens:build）。直接編集しない。正本は tokens/*.tokens.json。
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public enum DesignTokens {
  /// 明色・暗色の両方の値を持つ色。
  public enum Colors {
    public static let background = Color(light: 0xF5F5F7, dark: 0x1D1D1F)
    public static let foreground = Color(light: 0x1D1D1F, dark: 0xF5F5F7)
    public static let accent = Color(light: 0x0066CC, dark: 0x2997FF)
    public static let accentHover = Color(light: 0x0058B0, dark: 0x5CB0FF)
    public static let accentText = Color(light: 0xFFFFFF, dark: 0x000000)
    public static let lineStrong = Color(light: 0x8A8A93, dark: 0x8E8E93)
    public static let white = Color(light: 0xFFFFFF, dark: 0x2C2C2E)
    public static let slate50 = Color(light: 0xF5F5F7, dark: 0x252527)
    public static let slate100 = Color(light: 0xECECF0, dark: 0x353538)
    public static let slate200 = Color(light: 0xD9D9DE, dark: 0x424245)
    public static let slate300 = Color(light: 0xBCBCC4, dark: 0x58585C)
    public static let slate400 = Color(light: 0x68686D, dark: 0xA1A1A6)
    public static let slate500 = Color(light: 0x636366, dark: 0xA8A8AD)
    public static let slate600 = Color(light: 0x48484A, dark: 0xC7C7CC)
    public static let slate700 = Color(light: 0x3A3A3C, dark: 0xD9D9DE)
    public static let slate800 = Color(light: 0x2C2C2E, dark: 0xE8E8ED)
    public static let slate900 = Color(light: 0x1D1D1F, dark: 0xF5F5F7)
    public static let blue50 = Color(light: 0xEAF3FF, dark: 0x0C2A47)
    public static let blue100 = Color(light: 0xD6E8FF, dark: 0x10375E)
    public static let blue200 = Color(light: 0xA9CDF7, dark: 0x1F5588)
    public static let blue700 = Color(light: 0x0059B3, dark: 0x6CB6FF)
    public static let blue800 = Color(light: 0x004A99, dark: 0x8CC6FF)
    public static let blue900 = Color(light: 0x003A7A, dark: 0xB0D8FF)
    public static let red50 = Color(light: 0xFFF1E6, dark: 0x3D2210)
    public static let red100 = Color(light: 0xFFE3CC, dark: 0x4A2A12)
    public static let red200 = Color(light: 0xFFC999, dark: 0x6B3D1A)
    public static let red300 = Color(light: 0xF0A060, dark: 0x8F5326)
    public static let red400 = Color(light: 0xD96A1A, dark: 0xFF9F5A)
    public static let red600 = Color(light: 0xB84A00, dark: 0xFFA766)
    public static let red700 = Color(light: 0xA13F00, dark: 0xFFB27A)
    public static let red800 = Color(light: 0x8A3600, dark: 0xFFC299)
    public static let red900 = Color(light: 0x6E2B00, dark: 0xFFD2B3)
    public static let amber50 = Color(light: 0xFFF8E1, dark: 0x33290A)
    public static let amber100 = Color(light: 0xFFEFB8, dark: 0x40320C)
    public static let amber200 = Color(light: 0xF5D878, dark: 0x5C4915)
    public static let amber700 = Color(light: 0x7A5200, dark: 0xF0C64D)
    public static let amber800 = Color(light: 0x6B4700, dark: 0xF5D166)
    public static let amber900 = Color(light: 0x573A00, dark: 0xF9DE8A)
    public static let yellow50 = Color(light: 0xFFF8E1, dark: 0x33290A)
    public static let yellow100 = Color(light: 0xFFEFB8, dark: 0x40320C)
    public static let yellow300 = Color(light: 0xE6C24D, dark: 0x7D6320)
    public static let yellow800 = Color(light: 0x6B4700, dark: 0xF5D166)
    public static let yellow900 = Color(light: 0x573A00, dark: 0xF9DE8A)
    public static let green100 = Color(light: 0xD9F0F5, dark: 0x0C3A44)
    public static let green700 = Color(light: 0x00606F, dark: 0x6FD3E6)
    public static let green800 = Color(light: 0x004F5C, dark: 0x8FDCEC)
    public static let danger = Color(light: 0xB84A00, dark: 0xFFA766)
    public static let dangerText = Color(light: 0x8A3600, dark: 0xFFC299)
    public static let dangerSoft = Color(light: 0xFFF1E6, dark: 0x3D2210)
    public static let dangerLine = Color(light: 0xFFC999, dark: 0x6B3D1A)
    public static let success = Color(light: 0x00606F, dark: 0x6FD3E6)
    public static let successText = Color(light: 0x004F5C, dark: 0x8FDCEC)
    public static let successSoft = Color(light: 0xD9F0F5, dark: 0x0C3A44)
    public static let warning = Color(light: 0x7A5200, dark: 0xF0C64D)
    public static let warningText = Color(light: 0x6B4700, dark: 0xF5D166)
    public static let warningSoft = Color(light: 0xFFF8E1, dark: 0x33290A)
    public static let warningLine = Color(light: 0xF5D878, dark: 0x5C4915)
    public static let info = Color(light: 0x0059B3, dark: 0x6CB6FF)
    public static let infoText = Color(light: 0x004A99, dark: 0x8CC6FF)
    public static let infoSoft = Color(light: 0xEAF3FF, dark: 0x0C2A47)
    public static let infoLine = Color(light: 0xA9CDF7, dark: 0x1F5588)
    public static let muted = Color(light: 0x636366, dark: 0xA8A8AD)
  }

  public enum Motion {
    public struct CubicBezier { public let x1: Double, y1: Double, x2: Double, y2: Double }
    public static let easeApple = CubicBezier(x1: 0.2, y1: 0.8, x2: 0.2, y2: 1.0)
    /// 秒
    public static let springMoveDuration: Double = 0.47
    /// 秒
    public static let springRotateDuration: Double = 0.46
    /// 秒
    public static let springSheetDuration: Double = 0.35
    /// 秒
    public static let durFade: Double = 0.15
  }

  public enum Shadows {
    /// blur は CSS の blur 半径（px）。SwiftUI の radius に使うときは、見た目を確かめて調整する。
    public struct Layer { public let x: Double, y: Double, blur: Double, spread: Double, opacity: Double }
    public static let raised: [Layer] = [
      Layer(x: 0.0, y: 1.0, blur: 2.0, spread: 0.0, opacity: 0.08),
      Layer(x: 0.0, y: 1.0, blur: 3.0, spread: 0.0, opacity: 0.1),
    ]
    public static let overlay: [Layer] = [
      Layer(x: 0.0, y: 10.0, blur: 15.0, spread: -3, opacity: 0.12),
      Layer(x: 0.0, y: 4.0, blur: 6.0, spread: -4, opacity: 0.1),
    ]
  }
}

extension Color {
  /// 0xRRGGBB。暗色の画面では dark を返す。
  init(light: UInt32, dark: UInt32) {
    #if canImport(UIKit)
    self.init(UIColor { trait in
      let v = trait.userInterfaceStyle == .dark ? dark : light
      return UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
    })
    #else
    self.init(red: Double((light >> 16) & 0xFF) / 255, green: Double((light >> 8) & 0xFF) / 255, blue: Double(light & 0xFF) / 255)
    #endif
  }
}
