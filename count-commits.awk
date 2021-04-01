BEGIN {
    OFS=","
    print "date","author"
}

/Lenz/  { author="Ben Lenz" }
/unter/ { author="Corey Hunter" }
/jaar/  { author="Jay Arrellano" }
/autam/ { author="Gautam Tata" }
/bruns/ { author="Glenn Bruns" }
/sadi/  { author="Mustafa Al Asadi" }

/Date/ { 
    print $3" "$4" "$6,author
}
