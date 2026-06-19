import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await ApiService.getOpportunities(limit: 5);
      setState(() {
        _items = response.map((o) => {'symbol': o.symbol, 'score': o.opportunityScore}).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Watchlist')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.star_outline, size: 48, color: Colors.grey[600]),
                      const SizedBox(height: 12),
                      Text('No watchlist items yet', style: TextStyle(color: Colors.grey[400])),
                      const SizedBox(height: 4),
                      Text('Sign in to save favorites', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _items.length,
                  itemBuilder: (_, i) {
                    final item = _items[i];
                    return Card(
                      child: ListTile(
                        title: Text(item['symbol'] as String),
                        trailing: Text(
                          (item['score'] as double).toStringAsFixed(1),
                          style: const TextStyle(color: Color(0xFF2962FF), fontFamily: 'monospace'),
                        ),
                        onTap: () => Navigator.pushNamed(context, '/coin', arguments: item['symbol']),
                      ),
                    );
                  },
                ),
    );
  }
}
