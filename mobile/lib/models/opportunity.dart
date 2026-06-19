class Opportunity {
  final String symbol;
  final String signalType;
  final double opportunityScore;
  final double price;
  final double openInterest;
  final double oiChangePct;
  final double volumeUsdt;
  final double volumeChangePct;
  final double fundingRate;
  final double priceMomentum;
  final int? rank;

  Opportunity({
    required this.symbol,
    required this.signalType,
    required this.opportunityScore,
    required this.price,
    required this.openInterest,
    required this.oiChangePct,
    required this.volumeUsdt,
    required this.volumeChangePct,
    required this.fundingRate,
    required this.priceMomentum,
    this.rank,
  });

  factory Opportunity.fromJson(Map<String, dynamic> json) {
    return Opportunity(
      symbol: json['symbol'] as String,
      signalType: json['signalType'] as String,
      opportunityScore: (json['opportunityScore'] as num).toDouble(),
      price: (json['price'] as num).toDouble(),
      openInterest: (json['openInterest'] as num).toDouble(),
      oiChangePct: (json['oiChangePct'] as num).toDouble(),
      volumeUsdt: (json['volumeUsdt'] as num).toDouble(),
      volumeChangePct: (json['volumeChangePct'] as num).toDouble(),
      fundingRate: (json['fundingRate'] as num).toDouble(),
      priceMomentum: (json['priceMomentum'] as num).toDouble(),
      rank: json['rank'] as int?,
    );
  }

  String get signalLabel {
    switch (signalType) {
      case 'STRONG_LONG':
        return '🔥 Strong Long';
      case 'WEAK_LONG':
        return '🟢 Weak Long';
      case 'STRONG_SHORT':
        return '🔴 Strong Short';
      default:
        return '— Neutral';
    }
  }
}

class AlertItem {
  final String id;
  final String alertType;
  final String title;
  final String message;
  final String? symbol;
  final bool isRead;
  final DateTime triggeredAt;

  AlertItem({
    required this.id,
    required this.alertType,
    required this.title,
    required this.message,
    this.symbol,
    required this.isRead,
    required this.triggeredAt,
  });

  factory AlertItem.fromJson(Map<String, dynamic> json) {
    return AlertItem(
      id: json['id'] as String,
      alertType: json['alertType'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      symbol: json['symbol'] as String?,
      isRead: json['isRead'] as bool,
      triggeredAt: DateTime.parse(json['triggeredAt'] as String),
    );
  }
}
