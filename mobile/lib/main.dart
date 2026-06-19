import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/opportunity_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/dashboard_screen.dart';
import 'screens/coin_detail_screen.dart';
import 'screens/watchlist_screen.dart';
import 'screens/alerts_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.initialize();
  runApp(const TradePulseApp());
}

class TradePulseApp extends StatelessWidget {
  const TradePulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => OpportunityProvider()),
      ],
      child: MaterialApp(
        title: 'Trade-Pulse',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0B0E11),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF2962FF),
            secondary: Color(0xFF00C076),
            error: Color(0xFFF6465D),
            surface: Color(0xFF1E2329),
            onSurface: Color(0xFFEAECEF),
          ),
          textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
          cardTheme: CardTheme(
            color: const Color(0xFF1E2329),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF2B3139)),
            ),
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF0B0E11),
            elevation: 0,
            centerTitle: false,
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: Color(0xFF1E2329),
            selectedItemColor: Color(0xFF2962FF),
            unselectedItemColor: Color(0xFF848E9C),
            type: BottomNavigationBarType.fixed,
          ),
        ),
        home: const MainShell(),
        routes: {
          '/coin': (context) {
            final symbol = ModalRoute.of(context)!.settings.arguments as String;
            return CoinDetailScreen(symbol: symbol);
          },
        },
      ),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    DashboardScreen(),
    WatchlistScreen(),
    AlertsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Rankings'),
          BottomNavigationBarItem(icon: Icon(Icons.star_outline), label: 'Watchlist'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), label: 'Alerts'),
        ],
      ),
    );
  }
}
