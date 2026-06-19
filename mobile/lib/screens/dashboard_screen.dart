import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/opportunity_provider.dart';
import '../models/opportunity.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Trade-Pulse', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(
              'Real-Time Opportunity Scanner',
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
        actions: [
          Consumer<OpportunityProvider>(
            builder: (_, provider, __) => Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Row(
                children: [
                  Icon(
                    provider.wsConnected ? Icons.wifi : Icons.wifi_off,
                    size: 16,
                    color: provider.wsConnected ? const Color(0xFF00C076) : const Color(0xFFF6465D),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    provider.wsConnected ? 'Live' : 'Offline',
                    style: TextStyle(
                      fontSize: 11,
                      color: provider.wsConnected ? const Color(0xFF00C076) : const Color(0xFFF6465D),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: Consumer<OpportunityProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.opportunities.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null && provider.opportunities.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off, size: 48, color: Color(0xFF848E9C)),
                  const SizedBox(height: 12),
                  Text('Unable to connect', style: TextStyle(color: Colors.grey[400])),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => provider.fetchOpportunities(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchOpportunities(),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: provider.opportunities.length,
              itemBuilder: (context, index) {
                final opp = provider.opportunities[index];
                return _OpportunityCard(opportunity: opp);
              },
            ),
          );
        },
      ),
    );
  }
}

class _OpportunityCard extends StatelessWidget {
  final Opportunity opportunity;

  const _OpportunityCard({required this.opportunity});

  Color _signalColor() {
    switch (opportunity.signalType) {
      case 'STRONG_LONG':
        return const Color(0xFF00C076);
      case 'STRONG_SHORT':
        return const Color(0xFFF6465D);
      case 'WEAK_LONG':
        return const Color(0xFF26A69A);
      default:
        return const Color(0xFF848E9C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en');
    final pctFmt = NumberFormat('+#0.00;-#0.00', 'en');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, '/coin', arguments: opportunity.symbol),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      if (opportunity.rank != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2B3139),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '#${opportunity.rank}',
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                          ),
                        ),
                      const SizedBox(width: 8),
                      Text(
                        opportunity.symbol.replaceAll('USDT', ''),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text('/USDT', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2962FF).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF2962FF).withOpacity(0.3)),
                    ),
                    child: Text(
                      opportunity.opportunityScore.toStringAsFixed(1),
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2962FF),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                opportunity.signalLabel,
                style: TextStyle(fontSize: 12, color: _signalColor(), fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _MetricChip(label: 'OI', value: pctFmt.format(opportunity.oiChangePct) + '%'),
                  const SizedBox(width: 8),
                  _MetricChip(label: 'Vol', value: pctFmt.format(opportunity.volumeChangePct) + '%'),
                  const SizedBox(width: 8),
                  _MetricChip(
                    label: 'Fund',
                    value: '${(opportunity.fundingRate * 100).toStringAsFixed(4)}%',
                  ),
                  const Spacer(),
                  Text(
                    '\$${fmt.format(opportunity.price)}',
                    style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  final String label;
  final String value;

  const _MetricChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
        const SizedBox(width: 3),
        Text(value, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
      ],
    );
  }
}
