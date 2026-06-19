import 'package:flutter/foundation.dart';
import '../models/opportunity.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

class OpportunityProvider extends ChangeNotifier {
  List<Opportunity> _opportunities = [];
  bool _loading = true;
  String? _error;
  bool _wsConnected = false;
  final _ws = WebSocketService();

  List<Opportunity> get opportunities => _opportunities;
  bool get loading => _loading;
  String? get error => _error;
  bool get wsConnected => _wsConnected;

  OpportunityProvider() {
    _init();
  }

  Future<void> _init() async {
    await fetchOpportunities();
    _ws.connect();
    _ws.opportunityStream.listen((data) {
      _opportunities = data;
      _wsConnected = true;
      notifyListeners();
    });
  }

  Future<void> fetchOpportunities({String? signalType, double? minScore}) async {
    try {
      _loading = true;
      notifyListeners();
      _opportunities = await ApiService.getOpportunities(
        signalType: signalType,
        minScore: minScore,
      );
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _ws.dispose();
    super.dispose();
  }
}
