import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/opportunity.dart';
import '../services/api_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<AlertItem> _alerts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final alerts = await ApiService.getAlerts();
      setState(() { _alerts = alerts; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  IconData _alertIcon(String type) {
    switch (type) {
      case 'NEW_STRONG_LONG': return Icons.trending_up;
      case 'NEW_STRONG_SHORT': return Icons.trending_down;
      case 'OI_SPIKE': return Icons.show_chart;
      case 'VOLUME_SPIKE': return Icons.bar_chart;
      case 'FUNDING_FLIP': return Icons.swap_horiz;
      default: return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alerts')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _alerts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_none, size: 48, color: Colors.grey[600]),
                      const SizedBox(height: 12),
                      Text('No alerts yet', style: TextStyle(color: Colors.grey[400])),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _alerts.length,
                  itemBuilder: (_, i) {
                    final alert = _alerts[i];
                    return Card(
                      child: ListTile(
                        leading: Icon(_alertIcon(alert.alertType), color: const Color(0xFF2962FF)),
                        title: Text(alert.title, style: const TextStyle(fontSize: 14)),
                        subtitle: Text(alert.message, style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                        trailing: Text(
                          DateFormat.Hm().format(alert.triggeredAt),
                          style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
