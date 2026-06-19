import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/opportunity.dart';

class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  static String? _token;

  static void setToken(String token) => _token = token;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static Future<List<Opportunity>> getOpportunities({
    String? signalType,
    double? minScore,
    int limit = 50,
  }) async {
    final params = <String, String>{'limit': limit.toString()};
    if (signalType != null) params['signalType'] = signalType;
    if (minScore != null) params['minScore'] = minScore.toString();

    final uri = Uri.parse('$baseUrl/api/opportunities').replace(queryParameters: params);
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode != 200) throw Exception('Failed to load opportunities');

    final body = json.decode(response.body) as Map<String, dynamic>;
    final data = body['data'] as List;
    return data.map((e) => Opportunity.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> getCoinDetail(String symbol) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/symbols/$symbol'),
      headers: _headers,
    );
    if (response.statusCode != 200) throw Exception('Symbol not found');
    final body = json.decode(response.body) as Map<String, dynamic>;
    return body['data'] as Map<String, dynamic>;
  }

  static Future<List<AlertItem>> getAlerts({bool unreadOnly = false}) async {
    final uri = Uri.parse('$baseUrl/api/alerts').replace(
      queryParameters: unreadOnly ? {'unread': 'true'} : {},
    );
    final response = await http.get(uri, headers: _headers);
    if (response.statusCode != 200) throw Exception('Failed to load alerts');
    final body = json.decode(response.body) as Map<String, dynamic>;
    final data = body['data'] as List;
    return data.map((e) => AlertItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> addToWatchlist(String symbol) async {
    await http.post(
      Uri.parse('$baseUrl/api/watchlist'),
      headers: _headers,
      body: json.encode({'symbol': symbol}),
    );
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: _headers,
      body: json.encode({'email': email, 'password': password}),
    );
    if (response.statusCode != 200) throw Exception('Login failed');
    return json.decode(response.body) as Map<String, dynamic>;
  }
}
