function revstr(str)
{
    return str.split("").reverse().join("");
}

function get_return_value(result)
{
    let i = 0;
    let j = 0;
    let string;
    let final_string;
    let string2 = "\nreturn value : ";

    while (result[i])
    {
        i++;
    }
    while (result[i] != ' ')
    {
        string[j] = result[i];
        i+= -1;
    }
    string = revstr(string);
    final_string = string2 + string;
    console.log(final_string);
}