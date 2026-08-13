import os

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"No changes for {filepath}")

patch_file('../mobile/app/(app)/switch-restaurant.tsx', [
    (
'''      saveAuth({
        token: res.access_token,
        role: res.role || auth.role || "manager", // Fallback to current if missing
        schema: res.schema,
        viewMode: undefined, // Reset view mode on switch
      });''',
'''      saveAuth({
        token: res.access_token,
        role: res.role || auth.role || "manager", // Fallback to current if missing
        schema: res.schema,
        restaurantName: res.restaurant_name,
        viewMode: undefined, // Reset view mode on switch
      });'''
    )
])

patch_file('../mobile/app/(app)/(tabs)/home.tsx', [
    (
'''  const restaurantName = auth.restaurantName || "Minerva Coffee Shop";''',
'''  const restaurantName = auth.restaurantName || "Restaurant";'''
    )
])
