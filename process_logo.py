from PIL import Image

# Open the uploaded image
img = Image.open('C:/Users/IK/.gemini/antigravity-ide/brain/62a53475-6eeb-4538-9bf8-230c8aa11427/media__1784529799105.jpg').convert('RGBA')

# Get image data
datas = img.getdata()

# Process data to make black transparent
newData = []
for item in datas:
    # If the pixel is dark (black background), make it transparent
    if item[0] < 30 and item[1] < 30 and item[2] < 30:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

# Update image data
img.putdata(newData)

# Save as transparent PNG
img.save('c:/Users/IK/Downloads/Bulk Email Sender/Bulk-Sender/public/logo.png', 'PNG')
print('Image saved successfully')
