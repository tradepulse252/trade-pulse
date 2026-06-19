import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  bool _loading = false;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null;
  bool get loading => _loading;

  AuthProvider() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    if (_token != null) ApiService.setToken(_token!);
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final result = await ApiService.login(email, password);
      _token = result['token'] as String;
      _user = result['user'] as Map<String, dynamic>;
      ApiService.setToken(_token!);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      return true;
    } catch (_) {
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    notifyListeners();
  }
}
