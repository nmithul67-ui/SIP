# android/app/proguard-rules.pro
# Enable optimizations and shrinker for low-memory POS devices
-dontwarn **
-keep class * {
    public *;
}
# Preserve React Native classes needed at runtime
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Remove unused resources
-keepresourceattributes *
# Disable obfuscation for debugging (set to -dontobfuscate for release)
-dontobfuscate
# Enable shrinker to reduce APK size
-allowaccessmodification
