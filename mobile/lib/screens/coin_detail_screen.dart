import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CoinDetailScreen extends StatefulWidget {
  final String symbol;
  const CoinDetailScreen({super.key, required this.symbol});

  @override
  State<CoinDetailScreen> createState() => _CoinDetailScreenState();
}

class _CoinDetailScreenState extends State<CoinDetailScreen> {
  Map<String, dynamic>? _detail;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.getCoinDetail(widget.symbol);
      setState(() { _detail = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final signal = _detail?['signal'] as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(title: Text(widget.symbol)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _detail == null
              ? const Center(child: Text('Symbol not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (signal != null) ...[
                        Text(
                          '\$${(signal['price'] as num).toStringAsFixed(4)}',
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                        ),
                        const SizedBox(height: 8),
                        Text('Score: ${(signal['opportunityScore'] as num).toStringAsFixed(1)}',
                            style: const TextStyle(color: Color(0xFF2962FF))),
                        const SizedBox(height: 16),
                        _buildMetricsGrid(signal),
                      ],
                      const SizedBox(height: 24),
                      const Text('Growth Matrix', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      _buildGrowthMatrix(_detail!['growthMatrix'] as Map<String, dynamic>? ?? {}),
                    ],
                  ),
                ),
    );
  }

  Widget _buildMetricsGrid(Map<String, dynamic> signal) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 2,
      children: [
        _MetricCard('Open Interest', '\$${_formatNum(signal['openInterest'])}', '${(signal['oiChangePct'] as num).toStringAsFixed(2)}%'),
        _MetricCard('Volume', '\$${_formatNum(signal['volumeUsdt'])}', '${(signal['volumeChangePct'] as num).toStringAsFixed(2)}%'),
        _MetricCard('Funding', '${((signal['fundingRate'] as num) * 100).toStringAsFixed(4)}%', ''),
        _MetricCard('Momentum', '${(signal['priceMomentum'] as num).toStringAsFixed(2)}%', ''),
      ],
    );
  }

  Widget _buildGrowthMatrix(Map<String, dynamic> matrix) {
    final timeframes = ['5m', '15m', '30m', '1h', '2h', '4h', '24h', '7d'];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: timeframes.map((tf) {
            final m = matrix[tf] as Map<String, dynamic>?;
            if (m == null) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(width: 40, child: Text(tf, style: TextStyle(color: Colors.grey[500], fontSize: 12))),
                  Expanded(child: _pctCell('P', m['priceChangePct'])),
                  Expanded(child: _pctCell('OI', m['oiChangePct'])),
                  Expanded(child: _pctCell('V', m['volumeChangePct'])),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _pctCell(String label, dynamic value) {
    final v = (value as num?)?.toDouble() ?? 0;
    final color = v >= 0 ? const Color(0xFF00C076) : const Color(0xFFF6465D);
    return Text('$label: ${v >= 0 ? '+' : ''}${v.toStringAsFixed(2)}%',
        style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: color));
  }

  String _formatNum(dynamic n) {
    final v = (n as num).toDouble();
    if (v >= 1e9) return '${(v / 1e9).toStringAsFixed(2)}B';
    if (v >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M';
    if (v >= 1e3) return '${(v / 1e3).toStringAsFixed(2)}K';
    return v.toStringAsFixed(2);
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  const _MetricCard(this.label, this.value, this.sub);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
            if (sub.isNotEmpty) Text(sub, style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
          ],
        ),
      ),
    );
  }
}
