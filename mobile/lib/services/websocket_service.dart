import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/opportunity.dart';

class WebSocketService {
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://10.0.2.2:4000',
  );

  WebSocketChannel? _channel;
  final _opportunityController = StreamController<List<Opportunity>>.broadcast();
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;

  Stream<List<Opportunity>> get opportunityStream => _opportunityController.stream;

  void connect() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse('$wsUrl/ws'));

      _channel!.stream.listen(
        (message) {
          final data = json.decode(message as String) as Map<String, dynamic>;
          if (data['type'] == 'opportunity_update') {
            final opportunities = (data['data'] as List)
                .map((e) => Opportunity.fromJson(e as Map<String, dynamic>))
                .toList();
            _opportunityController.add(opportunities);
          }
        },
        onError: (_) => _scheduleReconnect(),
        onDone: () => _scheduleReconnect(),
      );

      _reconnectAttempts = 0;
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    final delay = Duration(seconds: (1 << _reconnectAttempts.clamp(0, 5)));
    _reconnectAttempts++;
    _reconnectTimer = Timer(delay, connect);
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    disconnect();
    _opportunityController.close();
  }
}
