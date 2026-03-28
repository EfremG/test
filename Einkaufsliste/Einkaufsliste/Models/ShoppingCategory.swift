import Foundation
import SwiftUI

enum ShoppingCategory: String, Codable, CaseIterable, Identifiable {
    case obstGemuese = "Obst & Gemüse"
    case milchprodukte = "Milchprodukte"
    case fleischFisch = "Fleisch & Fisch"
    case backwaren = "Backwaren"
    case getraenke = "Getränke"
    case haushalt = "Haushalt"
    case sonstiges = "Sonstiges"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .obstGemuese: return "leaf.fill"
        case .milchprodukte: return "cup.and.saucer.fill"
        case .fleischFisch: return "fish.fill"
        case .backwaren: return "birthday.cake.fill"
        case .getraenke: return "waterbottle.fill"
        case .haushalt: return "house.fill"
        case .sonstiges: return "cart.fill"
        }
    }

    var color: Color {
        switch self {
        case .obstGemuese: return .green
        case .milchprodukte: return .blue
        case .fleischFisch: return .red
        case .backwaren: return .orange
        case .getraenke: return .cyan
        case .haushalt: return .purple
        case .sonstiges: return .gray
        }
    }
}
